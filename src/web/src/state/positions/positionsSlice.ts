import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { Position, SettlementLadder } from '../../types/models';
import { PositionsState, PositionFilters, PositionSummary, PaginationState } from '../../types/state';
import { getPositions, filterPositions, getPositionById, getPositionSummary, getSettlementLadder } from '../../api/position';
import { POSITION_ENDPOINTS } from '../../constants/api';

// Async thunk for fetching positions
export const fetchPositions = createAsyncThunk(
  'positions/fetchPositions',
  async ({ businessDate, page = 0, size = 25, sort = [] }: { businessDate: string, page?: number, size?: number, sort?: string[] }, { rejectWithValue }) => {
    try {
      const response = await getPositions(businessDate, { page, size, sort });
      return response;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch positions');
    }
  }
);

// Async thunk for fetching a position by ID
export const fetchPositionById = createAsyncThunk(
  'positions/fetchPositionById',
  async ({ bookId, securityId, businessDate }: { bookId: string, securityId: string, businessDate: string }, { rejectWithValue }) => {
    try {
      const response = await getPositionById(bookId, securityId, businessDate);
      return response;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch position');
    }
  }
);

// Async thunk for fetching filtered positions
export const fetchFilteredPositions = createAsyncThunk(
  'positions/fetchFilteredPositions',
  async ({ filters, pagination }: { filters: PositionFilters, pagination: PaginationState }, { rejectWithValue }) => {
    try {
      // Convert filters to the format expected by filterPositions
      const filterParams = {
        filters: Object.entries(filters)
          .filter(([_, value]) => value !== null)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      };

      // Convert pagination to the format expected by filterPositions
      const paginationParams = {
        page: pagination.page,
        size: pagination.pageSize,
        sort: pagination.sort.length > 0 ? pagination.sort.join(',') : ''
      };

      const response = await filterPositions(filterParams, paginationParams);
      
      return {
        positions: response.content,
        pagination: {
          page: response.number,
          pageSize: response.size,
          totalElements: response.totalElements,
          totalPages: response.totalPages,
          sort: pagination.sort
        }
      };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch filtered positions');
    }
  }
);

// Async thunk for fetching position summary
export const fetchPositionSummary = createAsyncThunk(
  'positions/fetchPositionSummary',
  async ({ businessDate, filters }: { businessDate: string, filters?: Partial<PositionFilters> }, { rejectWithValue }) => {
    try {
      // Extract only the filters that are relevant to the position summary API
      const apiFilters = {
        ...(filters?.securityId && { securityId: filters.securityId }),
        ...(filters?.bookId && { bookId: filters.bookId }),
        ...(filters?.counterpartyId && { counterpartyId: filters.counterpartyId }),
        ...(filters?.aggregationUnitId && { aggregationUnitId: filters.aggregationUnitId })
      };
      
      const response = await getPositionSummary(businessDate, apiFilters);
      
      // Map the API response to our PositionSummary interface
      const summary: PositionSummary = {
        totalLongPositions: response.totalLong,
        totalShortPositions: response.totalShort,
        netPosition: response.netPosition,
        totalSecurities: response.securityCount,
        totalMarketValue: 0, // Default to 0 since it's not provided by the API
        businessDate,
        byBook: {}, // Default empty since not provided by the API
        byCounterparty: {}, // Default empty since not provided by the API
        byAggregationUnit: {} // Default empty since not provided by the API
      };
      
      return summary;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch position summary');
    }
  }
);

// Async thunk for fetching settlement ladder
export const fetchSettlementLadder = createAsyncThunk(
  'positions/fetchSettlementLadder',
  async ({ bookId, securityId, businessDate }: { bookId: string, securityId: string, businessDate: string }, { rejectWithValue }) => {
    try {
      const response = await getSettlementLadder(bookId, securityId, businessDate);
      return response;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch settlement ladder');
    }
  }
);

// Initial state
const initialState: PositionsState = {
  positions: [],
  selectedPosition: null,
  isLoading: false,
  error: null,
  filters: {
    securityId: null,
    bookId: null,
    counterpartyId: null,
    aggregationUnitId: null,
    positionType: null,
    businessDate: null,
    isHypothecatable: null,
    isReserved: null
  },
  pagination: {
    page: 0,
    pageSize: 25,
    totalElements: 0,
    totalPages: 0,
    sort: []
  },
  summary: null
};

// Create the positions slice
export const positionsSlice = createSlice({
  name: 'positions',
  initialState,
  reducers: {
    // Set the selected position
    setSelectedPosition: (state, action: PayloadAction<Position>) => {
      state.selectedPosition = action.payload;
    },
    // Clear the selected position
    clearSelectedPosition: (state) => {
      state.selectedPosition = null;
    },
    // Update position filters
    setPositionFilters: (state, action: PayloadAction<Partial<PositionFilters>>) => {
      state.filters = {
        ...state.filters,
        ...action.payload
      };
    },
    // Clear position filters
    clearPositionFilters: (state) => {
      state.filters = initialState.filters;
    },
    // Reset the entire positions state
    resetPositionsState: (state) => {
      return initialState;
    }
  },
  extraReducers: (builder) => {
    // Handle fetchPositions
    builder
      .addCase(fetchPositions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPositions.fulfilled, (state, action) => {
        state.positions = action.payload.content;
        state.pagination = {
          page: action.payload.number,
          pageSize: action.payload.size,
          totalElements: action.payload.totalElements,
          totalPages: action.payload.totalPages,
          sort: state.pagination.sort
        };
        state.isLoading = false;
      })
      .addCase(fetchPositions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unexpected error occurred';
      });

    // Handle fetchPositionById
    builder
      .addCase(fetchPositionById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPositionById.fulfilled, (state, action) => {
        state.selectedPosition = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchPositionById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unexpected error occurred';
      });

    // Handle fetchFilteredPositions
    builder
      .addCase(fetchFilteredPositions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFilteredPositions.fulfilled, (state, action) => {
        state.positions = action.payload.positions;
        state.pagination = action.payload.pagination;
        state.isLoading = false;
      })
      .addCase(fetchFilteredPositions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unexpected error occurred';
      });

    // Handle fetchPositionSummary
    builder
      .addCase(fetchPositionSummary.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPositionSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchPositionSummary.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unexpected error occurred';
      });

    // Handle fetchSettlementLadder
    builder
      .addCase(fetchSettlementLadder.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSettlementLadder.fulfilled, (state, action) => {
        // If there's a selected position, update its projected settled quantity
        // based on the settlement ladder data
        if (state.selectedPosition) {
          const settlementLadder: SettlementLadder = action.payload;
          
          state.selectedPosition = {
            ...state.selectedPosition,
            projectedSettledQty: settlementLadder.projectedPosition
          };
        }
        state.isLoading = false;
      })
      .addCase(fetchSettlementLadder.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string || 'An unexpected error occurred';
      });
  }
});

// Export actions
export const {
  setSelectedPosition,
  clearSelectedPosition,
  setPositionFilters,
  clearPositionFilters,
  resetPositionsState
} = positionsSlice.actions;

// Export reducer
export default positionsSlice.reducer;