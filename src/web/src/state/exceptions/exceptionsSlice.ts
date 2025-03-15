import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // @reduxjs/toolkit 1.9.5
import { ExceptionsState, Exception, ExceptionFilters, PaginationState } from '../../types/state';
import { 
  getExceptions, 
  getExceptionById, 
  acknowledgeException, 
  resolveException, 
  assignException, 
  escalateException, 
  addExceptionComment 
} from '../../api/exception';
import { PaginationParams, FilterParams, DateRangeParams } from '../../types/api';

/**
 * Initial state for the exceptions slice
 */
const initialState: ExceptionsState = {
  exceptions: [],
  selectedException: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  filters: {
    exceptionType: null,
    severity: null,
    status: null,
    assignedTo: null,
    fromDate: null,
    toDate: null,
    relatedEntityType: null,
    relatedEntityId: null
  },
  pagination: {
    page: 0,
    pageSize: 10,
    totalElements: 0,
    totalPages: 0,
    sort: []
  }
};

/**
 * Async thunk for fetching exceptions with pagination and filtering
 */
export const fetchExceptions = createAsyncThunk(
  'exceptions/fetchExceptions',
  async (params: PaginationParams & FilterParams & DateRangeParams) => {
    return await getExceptions(params);
  }
);

/**
 * Async thunk for fetching a specific exception by ID
 */
export const fetchExceptionById = createAsyncThunk(
  'exceptions/fetchExceptionById',
  async (id: string) => {
    return await getExceptionById(id);
  }
);

/**
 * Async thunk for acknowledging an exception
 */
export const acknowledgeExceptionThunk = createAsyncThunk(
  'exceptions/acknowledgeException',
  async (id: string) => {
    return await acknowledgeException(id);
  }
);

/**
 * Async thunk for resolving an exception
 */
export const resolveExceptionThunk = createAsyncThunk(
  'exceptions/resolveException',
  async (payload: { id: string, resolutionNotes: string }) => {
    const { id, resolutionNotes } = payload;
    return await resolveException(id, { resolutionNotes });
  }
);

/**
 * Async thunk for assigning an exception to a user
 */
export const assignExceptionThunk = createAsyncThunk(
  'exceptions/assignException',
  async (payload: { id: string, assigneeId: string }) => {
    const { id, assigneeId } = payload;
    return await assignException(id, { assigneeId });
  }
);

/**
 * Async thunk for escalating an exception
 */
export const escalateExceptionThunk = createAsyncThunk(
  'exceptions/escalateException',
  async (payload: { id: string, newSeverity: string, assigneeId?: string, escalationNotes: string }) => {
    const { id, ...data } = payload;
    return await escalateException(id, data);
  }
);

/**
 * Async thunk for adding a comment to an exception
 */
export const addExceptionCommentThunk = createAsyncThunk(
  'exceptions/addExceptionComment',
  async (payload: { id: string, comment: string }) => {
    const { id, comment } = payload;
    return await addExceptionComment(id, { comment });
  }
);

/**
 * Redux slice for managing system exceptions in the IMS
 */
export const exceptionsSlice = createSlice({
  name: 'exceptions',
  initialState,
  reducers: {
    // Set exception filters
    setExceptionFilters: (state, action: PayloadAction<Partial<ExceptionFilters>>) => {
      state.filters = {
        ...state.filters,
        ...action.payload
      };
    },
    
    // Reset exception filters to defaults
    resetExceptionFilters: (state) => {
      state.filters = initialState.filters;
    },
    
    // Set pagination
    setExceptionPagination: (state, action: PayloadAction<Partial<PaginationState>>) => {
      state.pagination = {
        ...state.pagination,
        ...action.payload
      };
    },
    
    // Set selected exception
    selectException: (state, action: PayloadAction<Exception>) => {
      state.selectedException = action.payload;
    },
    
    // Clear selected exception
    clearSelectedException: (state) => {
      state.selectedException = null;
    },
    
    // Clear error
    clearExceptionsError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    // Handle fetchExceptions
    builder
      .addCase(fetchExceptions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExceptions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.exceptions = action.payload.content as unknown as Exception[];
        state.pagination.totalElements = action.payload.totalElements;
        state.pagination.totalPages = action.payload.totalPages;
      })
      .addCase(fetchExceptions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Failed to fetch exceptions';
      });
      
    // Handle fetchExceptionById
    builder
      .addCase(fetchExceptionById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchExceptionById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedException = action.payload as unknown as Exception;
      })
      .addCase(fetchExceptionById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message ?? 'Failed to fetch exception details';
      });
      
    // Handle acknowledgeExceptionThunk
    builder
      .addCase(acknowledgeExceptionThunk.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(acknowledgeExceptionThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        
        // Update selected exception if it's the one that was acknowledged
        if (state.selectedException && state.selectedException.id === action.payload.id) {
          state.selectedException = action.payload as unknown as Exception;
        }
        
        // Update the exception in the list
        state.exceptions = state.exceptions.map(exception => 
          exception.id === action.payload.id ? (action.payload as unknown as Exception) : exception
        );
      })
      .addCase(acknowledgeExceptionThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message ?? 'Failed to acknowledge exception';
      });
      
    // Handle resolveExceptionThunk
    builder
      .addCase(resolveExceptionThunk.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(resolveExceptionThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        
        // Update selected exception if it's the one that was resolved
        if (state.selectedException && state.selectedException.id === action.payload.id) {
          state.selectedException = action.payload as unknown as Exception;
        }
        
        // Update the exception in the list
        state.exceptions = state.exceptions.map(exception => 
          exception.id === action.payload.id ? (action.payload as unknown as Exception) : exception
        );
      })
      .addCase(resolveExceptionThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message ?? 'Failed to resolve exception';
      });
      
    // Handle assignExceptionThunk
    builder
      .addCase(assignExceptionThunk.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(assignExceptionThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        
        // Update selected exception if it's the one that was assigned
        if (state.selectedException && state.selectedException.id === action.payload.id) {
          state.selectedException = action.payload as unknown as Exception;
        }
        
        // Update the exception in the list
        state.exceptions = state.exceptions.map(exception => 
          exception.id === action.payload.id ? (action.payload as unknown as Exception) : exception
        );
      })
      .addCase(assignExceptionThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message ?? 'Failed to assign exception';
      });
      
    // Handle escalateExceptionThunk
    builder
      .addCase(escalateExceptionThunk.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(escalateExceptionThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        
        // Update selected exception if it's the one that was escalated
        if (state.selectedException && state.selectedException.id === action.payload.id) {
          state.selectedException = action.payload as unknown as Exception;
        }
        
        // Update the exception in the list
        state.exceptions = state.exceptions.map(exception => 
          exception.id === action.payload.id ? (action.payload as unknown as Exception) : exception
        );
      })
      .addCase(escalateExceptionThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message ?? 'Failed to escalate exception';
      });
      
    // Handle addExceptionCommentThunk
    builder
      .addCase(addExceptionCommentThunk.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(addExceptionCommentThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        
        // Update selected exception if it's the one that got a comment
        if (state.selectedException && state.selectedException.id === action.payload.id) {
          state.selectedException = action.payload as unknown as Exception;
        }
        
        // Update the exception in the list
        state.exceptions = state.exceptions.map(exception => 
          exception.id === action.payload.id ? (action.payload as unknown as Exception) : exception
        );
      })
      .addCase(addExceptionCommentThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.error.message ?? 'Failed to add comment to exception';
      });
  }
});

// Export actions
export const {
  setExceptionFilters,
  resetExceptionFilters,
  setExceptionPagination,
  selectException,
  clearSelectedException,
  clearExceptionsError
} = exceptionsSlice.actions;

// Export reducer
export default exceptionsSlice.reducer;