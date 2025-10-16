import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { 
  QuizTemplateDTO, 
  QuizTemplateResponse, 
  UpdateQuestionDTO,
  QuestionResponse 
} from '@pkg/core';
import * as api from '../../lib/api';

interface QuizTemplateState {
  templates: QuizTemplateResponse[];
  selectedTemplate: QuizTemplateResponse | null;
  loading: boolean;
  uploading: boolean;
  error: string | null;
  uploadProgress: number;
}

const initialState: QuizTemplateState = {
  templates: [],
  selectedTemplate: null,
  loading: false,
  uploading: false,
  error: null,
  uploadProgress: 0,
};

// Async Thunks
export const fetchTemplates = createAsyncThunk(
  'quizTemplate/fetchTemplates',
  async (_, { rejectWithValue }) => {
    try {
      const templates = await api.listQuizTemplates();
      return templates;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch templates');
    }
  }
);

export const uploadTemplate = createAsyncThunk(
  'quizTemplate/uploadTemplate',
  async (template: QuizTemplateDTO, { rejectWithValue }) => {
    try {
      const response = await api.uploadQuizTemplate(template);
      return response;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to upload template');
    }
  }
);

export const fetchTemplateById = createAsyncThunk(
  'quizTemplate/fetchTemplateById',
  async (templateId: string, { rejectWithValue }) => {
    try {
      const template = await api.getQuizTemplate(templateId);
      return template;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch template');
    }
  }
);

export const updateQuestion = createAsyncThunk(
  'quizTemplate/updateQuestion',
  async ({ questionId, data }: { questionId: string; data: UpdateQuestionDTO }, { rejectWithValue }) => {
    try {
      const updatedQuestion = await api.updateQuizQuestion(questionId, data);
      return updatedQuestion;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update question');
    }
  }
);

export const deleteTemplate = createAsyncThunk(
  'quizTemplate/deleteTemplate',
  async (templateId: string, { rejectWithValue }) => {
    try {
      await api.deleteQuizTemplate(templateId);
      return templateId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to delete template');
    }
  }
);

// Slice
const quizTemplateSlice = createSlice({
  name: 'quizTemplate',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    selectTemplate: (state, action: PayloadAction<QuizTemplateResponse>) => {
      state.selectedTemplate = action.payload;
    },
    clearSelectedTemplate: (state) => {
      state.selectedTemplate = null;
    },
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch Templates
    builder.addCase(fetchTemplates.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTemplates.fulfilled, (state, action) => {
      state.loading = false;
      state.templates = action.payload;
    });
    builder.addCase(fetchTemplates.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Upload Template
    builder.addCase(uploadTemplate.pending, (state) => {
      state.uploading = true;
      state.error = null;
      state.uploadProgress = 0;
    });
    builder.addCase(uploadTemplate.fulfilled, (state, action) => {
      state.uploading = false;
      state.uploadProgress = 100;
      state.templates.push(action.payload);
    });
    builder.addCase(uploadTemplate.rejected, (state, action) => {
      state.uploading = false;
      state.uploadProgress = 0;
      state.error = action.payload as string;
    });

    // Fetch Template By ID
    builder.addCase(fetchTemplateById.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(fetchTemplateById.fulfilled, (state, action) => {
      state.loading = false;
      state.selectedTemplate = action.payload;
    });
    builder.addCase(fetchTemplateById.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Update Question
    builder.addCase(updateQuestion.pending, (state) => {
      state.error = null;
    });
    builder.addCase(updateQuestion.fulfilled, (state, action) => {
      // Update the question in the selected template
      if (state.selectedTemplate) {
        state.selectedTemplate.categories.forEach((category) => {
          const questionIndex = category.questions.findIndex((q) => q.id === action.payload.id);
          if (questionIndex !== -1) {
            category.questions[questionIndex] = action.payload;
          }
        });
      }
      // Also update in templates list
      state.templates.forEach((template) => {
        template.categories.forEach((category) => {
          const questionIndex = category.questions.findIndex((q) => q.id === action.payload.id);
          if (questionIndex !== -1) {
            category.questions[questionIndex] = action.payload;
          }
        });
      });
    });
    builder.addCase(updateQuestion.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Delete Template
    builder.addCase(deleteTemplate.pending, (state) => {
      state.error = null;
    });
    builder.addCase(deleteTemplate.fulfilled, (state, action) => {
      state.templates = state.templates.filter((t) => t.id !== action.payload);
      if (state.selectedTemplate?.id === action.payload) {
        state.selectedTemplate = null;
      }
    });
    builder.addCase(deleteTemplate.rejected, (state, action) => {
      state.error = action.payload as string;
    });
  },
});

export const { clearError, selectTemplate, clearSelectedTemplate, setUploadProgress } = quizTemplateSlice.actions;
export default quizTemplateSlice.reducer;
