import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.4.0
import { Order, OrderValidation } from '../../types/models';
import { OrdersState, OrderFilters } from '../../types/state';
import { PaginationParams, OrderValidationPayload, FilterParams } from '../../types/api';
import { 
  getOrders, 
  getOrderById, 
  filterOrders, 
  validateOrder,
  getOrdersBySecurityId,
  getOrdersByCounterpartyId,
  getOrdersByDateRange
} from '../../api/order';

/**
 * Initial state for the orders slice
 */
const initialState: OrdersState = {
  orders: [],
  selectedOrder: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  filters: {
    securityId: null,
    buyerCounterpartyId: null,
    sellerCounterpartyId: null,
    side: null,
    orderType: null,
    status: null,
    bookId: null,
    fromDate: null,
    toDate: null
  },
  pagination: {
    page: 0,
    pageSize: 20,
    totalElements: 0,
    totalPages: 0,
    sort: []
  }
};

/**
 * Async thunk for fetching a paginated list of orders
 * 
 * @param params - Pagination parameters for the request
 * @returns Promise resolving to an array of orders
 */
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (params: PaginationParams, { rejectWithValue }) => {
    try {
      const response = await getOrders(params);
      return response.data.content;
    } catch (error) {
      return rejectWithValue((error as Error).message || 'Failed to fetch orders');
    }
  }
);

/**
 * Async thunk for fetching a specific order by ID
 * 
 * @param orderId - The ID of the order to fetch
 * @returns Promise resolving to the order data
 */
export const fetchOrderById = createAsyncThunk(
  'orders/fetchOrderById',
  async (orderId: string, { rejectWithValue }) => {
    try {
      const response = await getOrderById(orderId);
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message || 'Failed to fetch order');
    }
  }
);

/**
 * Async thunk for fetching orders filtered by various criteria
 * 
 * @param params - Object containing filter criteria and pagination parameters
 * @returns Promise resolving to filtered orders and pagination info
 */
export const fetchFilteredOrders = createAsyncThunk(
  'orders/fetchFilteredOrders',
  async ({ 
    filters, 
    pagination 
  }: { 
    filters: OrderFilters, 
    pagination: PaginationParams 
  }, { rejectWithValue }) => {
    try {
      // Convert OrderFilters to FilterParams format
      const filterParams: FilterParams = {
        filters: {}
      };
      
      // Add non-null filter values to the filters object
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null) {
          filterParams.filters[key] = value;
        }
      });
      
      const response = await filterOrders(filterParams, pagination);
      
      return {
        orders: response.data.content,
        pagination: {
          totalElements: response.data.totalElements,
          totalPages: response.data.totalPages
        }
      };
    } catch (error) {
      return rejectWithValue((error as Error).message || 'Failed to filter orders');
    }
  }
);

/**
 * Async thunk for fetching orders for a specific security
 * 
 * @param params - Object containing securityId and pagination parameters
 * @returns Promise resolving to security-filtered orders and pagination info
 */
export const fetchOrdersBySecurityId = createAsyncThunk(
  'orders/fetchOrdersBySecurityId',
  async ({ 
    securityId, 
    pagination 
  }: { 
    securityId: string, 
    pagination: PaginationParams 
  }, { rejectWithValue }) => {
    try {
      const response = await getOrdersBySecurityId(securityId, pagination);
      
      return {
        orders: response.data.content,
        pagination: {
          totalElements: response.data.totalElements,
          totalPages: response.data.totalPages
        }
      };
    } catch (error) {
      return rejectWithValue((error as Error).message || 'Failed to fetch orders by security ID');
    }
  }
);

/**
 * Async thunk for validating an order against client and aggregation unit limits
 * This function is optimized to support the 150ms SLA requirement for short sell validation
 * 
 * @param validationData - Data required for order validation
 * @returns Promise resolving to the order validation result
 */
export const validateOrderThunk = createAsyncThunk(
  'orders/validateOrder',
  async (validationData: OrderValidationPayload, { rejectWithValue }) => {
    try {
      const response = await validateOrder(validationData);
      return response.data;
    } catch (error) {
      return rejectWithValue((error as Error).message || 'Failed to validate order');
    }
  }
);

/**
 * Orders slice containing reducers and async thunk handling
 */
const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    /**
     * Sets the selected order in the state
     */
    setSelectedOrder: (state, action: PayloadAction<Order>) => {
      state.selectedOrder = action.payload;
    },
    
    /**
     * Clears the selected order from the state
     */
    clearSelectedOrder: (state) => {
      state.selectedOrder = null;
    },
    
    /**
     * Sets filter criteria for orders
     */
    setOrderFilters: (state, action: PayloadAction<Partial<OrderFilters>>) => {
      state.filters = {
        ...state.filters,
        ...action.payload
      };
    },
    
    /**
     * Clears all order filters
     */
    clearOrderFilters: (state) => {
      state.filters = initialState.filters;
    },
    
    /**
     * Resets the entire orders state to initial values
     */
    resetOrdersState: () => initialState
  },
  extraReducers: (builder) => {
    // Handle fetchOrders
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = action.payload;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Handle fetchOrderById
    builder
      .addCase(fetchOrderById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedOrder = action.payload;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Handle fetchFilteredOrders
    builder
      .addCase(fetchFilteredOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFilteredOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = action.payload.orders;
        state.pagination.totalElements = action.payload.pagination.totalElements;
        state.pagination.totalPages = action.payload.pagination.totalPages;
      })
      .addCase(fetchFilteredOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Handle fetchOrdersBySecurityId
    builder
      .addCase(fetchOrdersBySecurityId.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrdersBySecurityId.fulfilled, (state, action) => {
        state.isLoading = false;
        state.orders = action.payload.orders;
        state.pagination.totalElements = action.payload.pagination.totalElements;
        state.pagination.totalPages = action.payload.pagination.totalPages;
      })
      .addCase(fetchOrdersBySecurityId.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
    
    // Handle validateOrderThunk - important for short sell order validation
    builder
      .addCase(validateOrderThunk.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(validateOrderThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        
        // If we have a selected order, update its validation property
        if (state.selectedOrder && state.selectedOrder.id === action.payload.orderId) {
          state.selectedOrder.validation = action.payload;
        }
        
        // Also update the validation in the orders array
        const orderIndex = state.orders.findIndex(
          order => order.id === action.payload.orderId
        );
        
        if (orderIndex !== -1) {
          state.orders[orderIndex].validation = action.payload;
        }
      })
      .addCase(validateOrderThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      });
  }
});

// Export actions
export const { 
  setSelectedOrder, 
  clearSelectedOrder, 
  setOrderFilters, 
  clearOrderFilters,
  resetOrdersState
} = ordersSlice.actions;

// Export the reducer as default
export default ordersSlice.reducer;

// Export the slice components for use in store configuration
export const { reducer, name, actions } = ordersSlice;