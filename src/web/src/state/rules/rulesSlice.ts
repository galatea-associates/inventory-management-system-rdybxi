import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // Redux Toolkit 1.9.5
import { RulesState, RuleFilters, RuleTestResult } from '../../types/state';
import { CalculationRule } from '../../types/models';
import { CalculationRulePayload } from '../../types/api';
import {
  getActiveRules,
  getRulesByTypeAndMarket,
  getRuleByNameAndMarket,
  createRule,
  updateRule,
  clearRuleCache,
  getRuleTypes,
  getRuleStatuses,
  getAvailableMarkets,
  testRule,
  publishRule,
  deactivateRule
} from '../../api/rule';

// Async thunk for fetching all active calculation rules
export const fetchRules = createAsyncThunk(
  'rules/fetchRules',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getActiveRules();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for fetching calculation rules by type and market
export const fetchRulesByTypeAndMarket = createAsyncThunk(
  'rules/fetchRulesByTypeAndMarket',
  async ({ ruleType, market }: { ruleType: string, market: string }, { rejectWithValue }) => {
    try {
      const response = await getRulesByTypeAndMarket(ruleType, market);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for fetching a calculation rule by name and market
export const fetchRuleByNameAndMarket = createAsyncThunk(
  'rules/fetchRuleByNameAndMarket',
  async ({ name, market }: { name: string, market: string }, { rejectWithValue }) => {
    try {
      const response = await getRuleByNameAndMarket(name, market);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for creating a new calculation rule
export const createNewRule = createAsyncThunk(
  'rules/createNewRule',
  async (rulePayload: CalculationRulePayload, { rejectWithValue }) => {
    try {
      const response = await createRule(rulePayload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for updating an existing calculation rule
export const updateExistingRule = createAsyncThunk(
  'rules/updateExistingRule',
  async (rulePayload: CalculationRulePayload, { rejectWithValue }) => {
    try {
      const response = await updateRule(rulePayload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for clearing the rule cache
export const clearRuleCacheThunk = createAsyncThunk(
  'rules/clearRuleCache',
  async (_, { rejectWithValue }) => {
    try {
      await clearRuleCache();
      return;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for fetching available rule types
export const fetchRuleTypes = createAsyncThunk(
  'rules/fetchRuleTypes',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getRuleTypes();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for fetching available rule statuses
export const fetchRuleStatuses = createAsyncThunk(
  'rules/fetchRuleStatuses',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getRuleStatuses();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for fetching available markets
export const fetchAvailableMarkets = createAsyncThunk(
  'rules/fetchAvailableMarkets',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getAvailableMarkets();
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for testing a calculation rule
export const testRuleThunk = createAsyncThunk(
  'rules/testRule',
  async (rulePayload: CalculationRulePayload, { rejectWithValue }) => {
    try {
      const response = await testRule(rulePayload);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for publishing a calculation rule
export const publishRuleThunk = createAsyncThunk(
  'rules/publishRule',
  async (ruleId: string, { rejectWithValue }) => {
    try {
      const response = await publishRule(ruleId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Async thunk for deactivating a calculation rule
export const deactivateRuleThunk = createAsyncThunk(
  'rules/deactivateRule',
  async (ruleId: string, { rejectWithValue }) => {
    try {
      const response = await deactivateRule(ruleId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Initial state for the rules slice
const initialState: RulesState = {
  rules: [],
  selectedRule: null,
  isLoading: false,
  isSubmitting: false,
  error: null,
  filters: {
    ruleType: null,
    market: null,
    status: null,
    name: null
  },
  pagination: {
    page: 0,
    pageSize: 10,
    totalElements: 0,
    totalPages: 0,
    sort: []
  },
  testResults: null
};

// Create the slice
export const rulesSlice = createSlice({
  name: 'rules',
  initialState,
  reducers: {
    // Action to set the selected rule
    setSelectedRule: (state, action: PayloadAction<CalculationRule>) => {
      state.selectedRule = action.payload;
    },
    // Action to clear the selected rule
    clearSelectedRule: (state) => {
      state.selectedRule = null;
    },
    // Action to update rule filters
    setRuleFilters: (state, action: PayloadAction<Partial<RuleFilters>>) => {
      state.filters = {
        ...state.filters,
        ...action.payload
      };
    },
    // Action to reset rule filters to default
    resetRuleFilters: (state) => {
      state.filters = initialState.filters;
    },
    // Action to clear test results
    clearRuleTestResults: (state) => {
      state.testResults = null;
    },
    // Action to update pagination settings
    setRulePagination: (state, action: PayloadAction<Partial<RulesState['pagination']>>) => {
      state.pagination = {
        ...state.pagination,
        ...action.payload
      };
    }
  },
  extraReducers: (builder) => {
    // Handle fetchRules
    builder
      .addCase(fetchRules.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRules.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rules = action.payload;
      })
      .addCase(fetchRules.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Handle fetchRulesByTypeAndMarket
    builder
      .addCase(fetchRulesByTypeAndMarket.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRulesByTypeAndMarket.fulfilled, (state, action) => {
        state.isLoading = false;
        state.rules = action.payload;
      })
      .addCase(fetchRulesByTypeAndMarket.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Handle fetchRuleByNameAndMarket
    builder
      .addCase(fetchRuleByNameAndMarket.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchRuleByNameAndMarket.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedRule = action.payload;
      })
      .addCase(fetchRuleByNameAndMarket.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Handle createNewRule
    builder
      .addCase(createNewRule.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(createNewRule.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.rules = [...state.rules, action.payload];
        state.selectedRule = action.payload;
      })
      .addCase(createNewRule.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      });

    // Handle updateExistingRule
    builder
      .addCase(updateExistingRule.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(updateExistingRule.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.rules = state.rules.map(rule => 
          rule.id === action.payload.id ? action.payload : rule
        );
        state.selectedRule = action.payload;
      })
      .addCase(updateExistingRule.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      });

    // Handle clearRuleCache
    builder
      .addCase(clearRuleCacheThunk.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(clearRuleCacheThunk.fulfilled, (state) => {
        state.isSubmitting = false;
      })
      .addCase(clearRuleCacheThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      });

    // Handle testRule
    builder
      .addCase(testRuleThunk.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(testRuleThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.testResults = action.payload;
      })
      .addCase(testRuleThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      });

    // Handle publishRule
    builder
      .addCase(publishRuleThunk.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(publishRuleThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.rules = state.rules.map(rule => 
          rule.id === action.payload.id ? action.payload : rule
        );
        if (state.selectedRule && state.selectedRule.id === action.payload.id) {
          state.selectedRule = action.payload;
        }
      })
      .addCase(publishRuleThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      });

    // Handle deactivateRule
    builder
      .addCase(deactivateRuleThunk.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(deactivateRuleThunk.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.rules = state.rules.map(rule => 
          rule.id === action.payload.id ? action.payload : rule
        );
        if (state.selectedRule && state.selectedRule.id === action.payload.id) {
          state.selectedRule = action.payload;
        }
      })
      .addCase(deactivateRuleThunk.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload as string;
      });
  }
});

// Export actions and reducer
export const { 
  setSelectedRule, 
  clearSelectedRule, 
  setRuleFilters, 
  resetRuleFilters,
  clearRuleTestResults,
  setRulePagination
} = rulesSlice.actions;

export const rulesReducer = rulesSlice.reducer;