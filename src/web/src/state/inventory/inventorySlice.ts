import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'; // @reduxjs/toolkit 1.9.5
import { InventoryState, InventoryFilters, InventorySummary, TopSecurityItem } from '../../types/state';
import { Inventory } from '../../types/models';
import { PaginatedResponse, FilterParams, PaginationParams } from '../../types/api';
import { 
  getInventory, 
  filterInventory, 
  getForLoanAvailability, 
  getForPledgeAvailability, 
  getOverborrows, 
  getInventorySummary, 
  getTopSecurities, 
  getInventoryByCategory 
} from '../../api/inventory';

// Initial state for inventory management
const initialState: InventoryState = {
  inventories: [],
  selectedInventory: null,
  isLoading: false,
  error: null,
  filters: {
    securityId: null,
    counterpartyId: null,
    aggregationUnitId: null,
    calculationType: null,
    businessDate: null,
    market: null,
    securityTemperature: null,
    isExternalSource: null
  },
  pagination: {
    page: 0,
    pageSize: 20,
    totalElements: 0,
    totalPages: 0,
    sort: ['marketValue,desc']
  },
  summary: null,
  topSecurities: []
};

/**
 * Async thunk for fetching inventory data for a specific business date
 */
export const fetchInventory = createAsyncThunk(
  'inventory/fetchInventory',
  async ({ 
    businessDate, 
    page = 0, 
    size = 20, 
    sort = ['marketValue,desc'] 
  }: { 
    businessDate: string;
    page?: number;
    size?: number;
    sort?: string[];
  }, { rejectWithValue }) => {
    try {
      const response = await getInventory(businessDate, { page, size, sort });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch inventory data');
    }
  }
);

/**
 * Async thunk for fetching inventory data with filters
 */
export const fetchFilteredInventory = createAsyncThunk(
  'inventory/fetchFilteredInventory',
  async ({ 
    filters, 
    pagination 
  }: { 
    filters: InventoryFilters; 
    pagination: PaginationParams;
  }, { rejectWithValue }) => {
    try {
      // Convert InventoryFilters to FilterParams format
      const filterParams: FilterParams = {
        filters: Object.entries(filters)
          .filter(([_, value]) => value !== null)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      };
      
      const response = await filterInventory(filterParams, pagination);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch filtered inventory data');
    }
  }
);

/**
 * Async thunk for fetching for-loan availability data
 */
export const fetchForLoanAvailability = createAsyncThunk(
  'inventory/fetchForLoanAvailability',
  async ({ 
    businessDate, 
    filters, 
    pagination 
  }: { 
    businessDate: string;
    filters?: object;
    pagination?: PaginationParams;
  }, { rejectWithValue }) => {
    try {
      const response = await getForLoanAvailability(
        businessDate, 
        filters, 
        pagination
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch for-loan availability data');
    }
  }
);

/**
 * Async thunk for fetching for-pledge availability data
 */
export const fetchForPledgeAvailability = createAsyncThunk(
  'inventory/fetchForPledgeAvailability',
  async ({ 
    businessDate, 
    filters, 
    pagination 
  }: { 
    businessDate: string;
    filters?: object;
    pagination?: PaginationParams;
  }, { rejectWithValue }) => {
    try {
      const response = await getForPledgeAvailability(
        businessDate, 
        filters, 
        pagination
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch for-pledge availability data');
    }
  }
);

/**
 * Async thunk for fetching overborrow data
 */
export const fetchOverborrows = createAsyncThunk(
  'inventory/fetchOverborrows',
  async ({ 
    businessDate, 
    filters, 
    pagination 
  }: { 
    businessDate: string;
    filters?: object;
    pagination?: PaginationParams;
  }, { rejectWithValue }) => {
    try {
      const response = await getOverborrows(
        businessDate, 
        filters, 
        pagination
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch overborrow data');
    }
  }
);

/**
 * Async thunk for fetching inventory summary data
 */
export const fetchInventorySummary = createAsyncThunk(
  'inventory/fetchInventorySummary',
  async ({ 
    businessDate, 
    filters 
  }: { 
    businessDate: string;
    filters?: { calculationType?: string; market?: string; }
  }, { rejectWithValue }) => {
    try {
      const response = await getInventorySummary(businessDate, filters);
      const data = response.data;
      
      // Transform the API response to match the InventorySummary type
      const summary: InventorySummary = {
        totalInventory: data.totalInventory,
        forLoanTotal: data.forLoan,
        forPledgeTotal: data.forPledge,
        hardToBorrowTotal: data.htbValue,
        generalCollateralTotal: data.totalInventory - data.htbValue,
        businessDate: businessDate,
        byMarket: {}, // Will be populated by another call
        byCalculationType: {
          'FOR_LOAN': data.forLoan,
          'FOR_PLEDGE': data.forPledge
        },
        byTemperature: {
          'HTB': data.htbValue,
          'GC': data.totalInventory - data.htbValue
        }
      };
      
      return summary;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch inventory summary data');
    }
  }
);

/**
 * Async thunk for fetching top securities by availability
 */
export const fetchTopSecurities = createAsyncThunk(
  'inventory/fetchTopSecurities',
  async ({ 
    businessDate, 
    calculationType, 
    limit = 10, 
    filters 
  }: { 
    businessDate: string;
    calculationType: string;
    limit?: number;
    filters?: object;
  }, { rejectWithValue }) => {
    try {
      const response = await getTopSecurities(
        businessDate, 
        calculationType, 
        limit, 
        filters
      );
      
      // Transform the API response to match the TopSecurityItem type
      const topSecurities: TopSecurityItem[] = response.data.map(item => ({
        securityId: item.security.id,
        securityName: item.security.description,
        availableQuantity: item.availableQuantity,
        marketValue: item.marketValue,
        market: '', // Not provided in the response, defaulting to empty string
        securityTemperature: '' // Not provided in the response, defaulting to empty string
      }));
      
      return topSecurities;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch top securities data');
    }
  }
);

/**
 * Async thunk for fetching inventory data grouped by category
 */
export const fetchInventoryByCategory = createAsyncThunk(
  'inventory/fetchInventoryByCategory',
  async ({ 
    businessDate, 
    groupBy, 
    filters 
  }: { 
    businessDate: string;
    groupBy: string;
    filters?: object;
  }, { rejectWithValue }) => {
    try {
      const response = await getInventoryByCategory(
        businessDate, 
        groupBy, 
        filters
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch inventory by category data');
    }
  }
);

// Create the inventory slice
export const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    /**
     * Sets the selected inventory item
     */
    setSelectedInventory: (state, action: PayloadAction<Inventory>) => {
      state.selectedInventory = action.payload;
    },
    
    /**
     * Clears the selected inventory item
     */
    clearSelectedInventory: (state) => {
      state.selectedInventory = null;
    },
    
    /**
     * Updates inventory filters
     */
    setInventoryFilters: (state, action: PayloadAction<Partial<InventoryFilters>>) => {
      state.filters = {
        ...state.filters,
        ...action.payload
      };
    },
    
    /**
     * Resets inventory filters to default values
     */
    clearInventoryFilters: (state) => {
      state.filters = initialState.filters;
    },
    
    /**
     * Updates pagination parameters
     */
    setInventoryPagination: (state, action: PayloadAction<Partial<PaginationParams>>) => {
      state.pagination = {
        ...state.pagination,
        ...action.payload
      };
    },
    
    /**
     * Resets the inventory state to initial values
     */
    resetInventoryState: (state) => {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    // Handle fetchInventory lifecycle
    builder
      .addCase(fetchInventory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.inventories = action.payload.content;
        state.pagination = {
          ...state.pagination,
          totalElements: action.payload.totalElements,
          totalPages: action.payload.totalPages,
          page: action.payload.number,
          pageSize: action.payload.size
        };
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An error occurred';
      });
    
    // Handle fetchFilteredInventory lifecycle
    builder
      .addCase(fetchFilteredInventory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFilteredInventory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.inventories = action.payload.content;
        state.pagination = {
          ...state.pagination,
          totalElements: action.payload.totalElements,
          totalPages: action.payload.totalPages,
          page: action.payload.number,
          pageSize: action.payload.size
        };
      })
      .addCase(fetchFilteredInventory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An error occurred';
      });
    
    // Handle fetchForLoanAvailability lifecycle
    builder
      .addCase(fetchForLoanAvailability.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchForLoanAvailability.fulfilled, (state, action) => {
        state.isLoading = false;
        state.inventories = action.payload.content;
        state.pagination = {
          ...state.pagination,
          totalElements: action.payload.totalElements,
          totalPages: action.payload.totalPages,
          page: action.payload.number,
          pageSize: action.payload.size
        };
      })
      .addCase(fetchForLoanAvailability.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An error occurred';
      });
    
    // Handle fetchForPledgeAvailability lifecycle
    builder
      .addCase(fetchForPledgeAvailability.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchForPledgeAvailability.fulfilled, (state, action) => {
        state.isLoading = false;
        state.inventories = action.payload.content;
        state.pagination = {
          ...state.pagination,
          totalElements: action.payload.totalElements,
          totalPages: action.payload.totalPages,
          page: action.payload.number,
          pageSize: action.payload.size
        };
      })
      .addCase(fetchForPledgeAvailability.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An error occurred';
      });
    
    // Handle fetchOverborrows lifecycle
    builder
      .addCase(fetchOverborrows.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOverborrows.fulfilled, (state, action) => {
        state.isLoading = false;
        state.inventories = action.payload.content;
        state.pagination = {
          ...state.pagination,
          totalElements: action.payload.totalElements,
          totalPages: action.payload.totalPages,
          page: action.payload.number,
          pageSize: action.payload.size
        };
      })
      .addCase(fetchOverborrows.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An error occurred';
      });
    
    // Handle fetchInventorySummary lifecycle
    builder
      .addCase(fetchInventorySummary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInventorySummary.fulfilled, (state, action) => {
        state.isLoading = false;
        state.summary = action.payload;
      })
      .addCase(fetchInventorySummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An error occurred';
      });
    
    // Handle fetchTopSecurities lifecycle
    builder
      .addCase(fetchTopSecurities.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTopSecurities.fulfilled, (state, action) => {
        state.isLoading = false;
        state.topSecurities = action.payload;
      })
      .addCase(fetchTopSecurities.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An error occurred';
      });
    
    // Handle fetchInventoryByCategory lifecycle
    builder
      .addCase(fetchInventoryByCategory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInventoryByCategory.fulfilled, (state, action) => {
        state.isLoading = false;
        // Note: The category data from this API call isn't explicitly stored in a designated
        // state field. Components should use the returned action payload directly
        // or this implementation can be extended to store this data if needed.
      })
      .addCase(fetchInventoryByCategory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An error occurred';
      });
  }
});

// Export actions
export const { 
  setSelectedInventory, 
  clearSelectedInventory, 
  setInventoryFilters, 
  clearInventoryFilters, 
  setInventoryPagination, 
  resetInventoryState 
} = inventorySlice.actions;

// Export reducer
export const inventoryReducer = inventorySlice.reducer;

export default inventoryReducer;