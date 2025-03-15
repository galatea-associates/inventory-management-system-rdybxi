import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { LocatesState, LocateFilters, LocateSummary, PaginationState } from '../../types/state';
import { LocateRequest, LocateApproval, LocateRejection } from '../../types/models';
import { PaginatedResponse, LocateRequestPayload, LocateApprovalPayload, LocateRejectionPayload } from '../../types/api';
import { getLocates, getLocateById, filterLocates, submitLocateRequest, approveLocateRequest, rejectLocateRequest, getLocateSummary } from '../../api/locate';
import { handleError } from '../../utils/errorHandler';
import { invalidateCache } from '../../utils/api';

/**
 * Initial state for the locates slice
 */
const initialState: LocatesState = {
  locates: [],
  selectedLocate: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  filters: {
    securityId: null,
    requestorId: null,
    clientId: null,
    aggregationUnitId: null,
    locateType: null,
    status: null,
    swapCashIndicator: null,
    fromDate: null,
    toDate: null
  },
  pagination: {
    page: 0,
    pageSize: 10,
    totalElements: 0,
    totalPages: 0,
    sort: ['requestTimestamp,desc']
  },
  summary: null
};

/**
 * Async thunk for fetching locate requests with pagination
 */
export const fetchLocates = createAsyncThunk(
  'locates/fetchLocates',
  async (params?: { page?: number; size?: number; sort?: string[] }, { rejectWithValue }) => {
    try {
      const response = await getLocates(params);
      return response.data;
    } catch (err) {
      return rejectWithValue(handleError(err));
    }
  }
);

/**
 * Async thunk for fetching a specific locate request by ID
 */
export const fetchLocateById = createAsyncThunk(
  'locates/fetchLocateById',
  async (locateId: string, { rejectWithValue }) => {
    try {
      const response = await getLocateById(locateId);
      return response.data;
    } catch (err) {
      return rejectWithValue(handleError(err));
    }
  }
);

/**
 * Async thunk for filtering locate requests based on criteria
 */
export const filterLocateRequests = createAsyncThunk(
  'locates/filterLocateRequests',
  async (payload: { filters: LocateFilters; pagination: PaginationState }, { rejectWithValue }) => {
    try {
      const { filters, pagination } = payload;
      const filterParams = {
        filters: Object.entries(filters)
          .filter(([_, value]) => value !== null)
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      };

      const response = await filterLocates(filterParams, pagination);
      return response.data;
    } catch (err) {
      return rejectWithValue(handleError(err));
    }
  }
);

/**
 * Async thunk for submitting a new locate request
 */
export const submitLocate = createAsyncThunk(
  'locates/submitLocate',
  async (locateRequest: LocateRequestPayload, { rejectWithValue }) => {
    try {
      const response = await submitLocateRequest(locateRequest);
      
      // Invalidate cache to ensure fresh data on next fetch
      invalidateCache('locates');
      
      return response.data;
    } catch (err) {
      return rejectWithValue(handleError(err));
    }
  }
);

/**
 * Async thunk for approving a locate request
 */
export const approveLocate = createAsyncThunk(
  'locates/approveLocate',
  async (payload: { locateId: string; approvalData: LocateApprovalPayload }, { rejectWithValue }) => {
    try {
      const { locateId, approvalData } = payload;
      const response = await approveLocateRequest(locateId, approvalData);
      
      // Invalidate cache to ensure fresh data on next fetch
      invalidateCache('locates');
      
      return response.data;
    } catch (err) {
      return rejectWithValue(handleError(err));
    }
  }
);

/**
 * Async thunk for rejecting a locate request
 */
export const rejectLocate = createAsyncThunk(
  'locates/rejectLocate',
  async (payload: { locateId: string; rejectionData: LocateRejectionPayload }, { rejectWithValue }) => {
    try {
      const { locateId, rejectionData } = payload;
      const response = await rejectLocateRequest(locateId, rejectionData);
      
      // Invalidate cache to ensure fresh data on next fetch
      invalidateCache('locates');
      
      return response.data;
    } catch (err) {
      return rejectWithValue(handleError(err));
    }
  }
);

/**
 * Async thunk for fetching locate request summary metrics
 */
export const fetchLocateSummary = createAsyncThunk(
  'locates/fetchLocateSummary',
  async (businessDate: string, { rejectWithValue }) => {
    try {
      const response = await getLocateSummary(businessDate);
      
      // Transform API response into LocateSummary format
      const data = response.data;
      const summary: LocateSummary = {
        totalRequests: data.total,
        pendingRequests: data.pending,
        approvedRequests: data.approved,
        rejectedRequests: data.rejected,
        autoApprovedCount: data.autoApproved,
        manualApprovedCount: data.approved - data.autoApproved,
        bySecurityId: {},
        byClientId: {},
        byStatus: {
          pending: data.pending,
          approved: data.approved,
          rejected: data.rejected
        }
      };
      
      return summary;
    } catch (err) {
      return rejectWithValue(handleError(err));
    }
  }
);

/**
 * Redux slice for managing locate request state
 */
export const locatesSlice = createSlice({
  name: 'locates',
  initialState,
  reducers: {
    /**
     * Sets the selected locate request
     */
    setSelectedLocate: (state, action: PayloadAction<LocateRequest>) => {
      state.selectedLocate = action.payload;
    },
    
    /**
     * Clears the selected locate request
     */
    clearSelectedLocate: (state) => {
      state.selectedLocate = null;
    },
    
    /**
     * Sets filters for locate requests
     */
    setLocateFilters: (state, action: PayloadAction<Partial<LocateFilters>>) => {
      state.filters = {
        ...state.filters,
        ...action.payload
      };
    },
    
    /**
     * Clears all locate request filters
     */
    clearLocateFilters: (state) => {
      state.filters = initialState.filters;
    },
    
    /**
     * Sets pagination parameters for locate requests
     */
    setLocatePagination: (state, action: PayloadAction<Partial<PaginationState>>) => {
      state.pagination = {
        ...state.pagination,
        ...action.payload
      };
    }
  },
  extraReducers: (builder) => {
    // fetchLocates
    builder.addCase(fetchLocates.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchLocates.fulfilled, (state, action) => {
      state.isLoading = false;
      state.locates = action.payload.content;
      state.pagination = {
        ...state.pagination,
        totalElements: action.payload.totalElements,
        totalPages: action.payload.totalPages,
        page: action.payload.number,
        pageSize: action.payload.size
      };
    });
    builder.addCase(fetchLocates.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string || 'Failed to fetch locate requests';
    });
    
    // fetchLocateById
    builder.addCase(fetchLocateById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchLocateById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.selectedLocate = action.payload;
      
      // Update the locate in the list if it exists
      const index = state.locates.findIndex(l => l.id === action.payload.id);
      if (index !== -1) {
        state.locates[index] = action.payload;
      }
    });
    builder.addCase(fetchLocateById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string || 'Failed to fetch locate request';
    });
    
    // filterLocateRequests
    builder.addCase(filterLocateRequests.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(filterLocateRequests.fulfilled, (state, action) => {
      state.isLoading = false;
      state.locates = action.payload.content;
      state.pagination = {
        ...state.pagination,
        totalElements: action.payload.totalElements,
        totalPages: action.payload.totalPages,
        page: action.payload.number,
        pageSize: action.payload.size
      };
    });
    builder.addCase(filterLocateRequests.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string || 'Failed to filter locate requests';
    });
    
    // submitLocate
    builder.addCase(submitLocate.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(submitLocate.fulfilled, (state, action) => {
      state.isSubmitting = false;
      // Add the new locate request to the list
      state.locates = [action.payload, ...state.locates];
      state.selectedLocate = action.payload;
    });
    builder.addCase(submitLocate.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = action.payload as string || 'Failed to submit locate request';
    });
    
    // approveLocate
    builder.addCase(approveLocate.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(approveLocate.fulfilled, (state, action) => {
      state.isSubmitting = false;
      
      // Update the locate request status and approval info in both the list and selected item
      if (state.selectedLocate && state.selectedLocate.id === action.payload.requestId) {
        state.selectedLocate = {
          ...state.selectedLocate,
          status: 'APPROVED',
          approval: action.payload
        };
      }
      
      const locateIndex = state.locates.findIndex(l => l.id === action.payload.requestId);
      if (locateIndex !== -1) {
        state.locates[locateIndex] = {
          ...state.locates[locateIndex],
          status: 'APPROVED',
          approval: action.payload
        };
      }
      
      // Update summary if available
      if (state.summary) {
        state.summary = {
          ...state.summary,
          pendingRequests: Math.max(0, state.summary.pendingRequests - 1),
          approvedRequests: state.summary.approvedRequests + 1,
          manualApprovedCount: state.summary.manualApprovedCount + 1,
          byStatus: {
            ...state.summary.byStatus,
            pending: Math.max(0, state.summary.byStatus.pending - 1),
            approved: (state.summary.byStatus.approved || 0) + 1
          }
        };
      }
    });
    builder.addCase(approveLocate.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = action.payload as string || 'Failed to approve locate request';
    });
    
    // rejectLocate
    builder.addCase(rejectLocate.pending, (state) => {
      state.isSubmitting = true;
      state.error = null;
    });
    builder.addCase(rejectLocate.fulfilled, (state, action) => {
      state.isSubmitting = false;
      
      // Update the locate request status and rejection info in both the list and selected item
      if (state.selectedLocate && state.selectedLocate.id === action.payload.requestId) {
        state.selectedLocate = {
          ...state.selectedLocate,
          status: 'REJECTED',
          rejection: action.payload
        };
      }
      
      const locateIndex = state.locates.findIndex(l => l.id === action.payload.requestId);
      if (locateIndex !== -1) {
        state.locates[locateIndex] = {
          ...state.locates[locateIndex],
          status: 'REJECTED',
          rejection: action.payload
        };
      }
      
      // Update summary if available
      if (state.summary) {
        state.summary = {
          ...state.summary,
          pendingRequests: Math.max(0, state.summary.pendingRequests - 1),
          rejectedRequests: state.summary.rejectedRequests + 1,
          byStatus: {
            ...state.summary.byStatus,
            pending: Math.max(0, state.summary.byStatus.pending - 1),
            rejected: (state.summary.byStatus.rejected || 0) + 1
          }
        };
      }
    });
    builder.addCase(rejectLocate.rejected, (state, action) => {
      state.isSubmitting = false;
      state.error = action.payload as string || 'Failed to reject locate request';
    });
    
    // fetchLocateSummary
    builder.addCase(fetchLocateSummary.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchLocateSummary.fulfilled, (state, action) => {
      state.isLoading = false;
      state.summary = action.payload;
    });
    builder.addCase(fetchLocateSummary.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string || 'Failed to fetch locate summary';
    });
  }
});

// Export actions
export const {
  setSelectedLocate,
  clearSelectedLocate,
  setLocateFilters,
  clearLocateFilters,
  setLocatePagination
} = locatesSlice.actions;

// Export the reducer as default
export default locatesSlice.reducer;