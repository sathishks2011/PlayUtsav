import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchBioscopeTemplates,
  selectTemplate,
  clearSelectedTemplate,
  type BioscopeTemplate,
} from '../store/slices/bioscopeSlice';

interface BioscopeTemplateSelectorProps {
  hostId?: string;
  onTemplateSelect?: (template: BioscopeTemplate | null) => void;
}

export const BioscopeTemplateSelector: React.FC<BioscopeTemplateSelectorProps> = ({
  hostId,
  onTemplateSelect,
}) => {
  const dispatch = useAppDispatch();
  const { templates, selectedTemplate, loading, error } = useAppSelector((state) => state.bioscope);

  useEffect(() => {
    dispatch(fetchBioscopeTemplates({ hostId, includePublic: true }));
  }, [dispatch, hostId]);

  const handleSelectTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = e.target.value;
    
    if (!templateId) {
      dispatch(clearSelectedTemplate());
      onTemplateSelect?.(null);
      return;
    }

    const template = templates.find((t) => t.id === templateId);
    if (template) {
      dispatch(selectTemplate(template));
      onTemplateSelect?.(template);
    }
  };

  if (loading && templates.length === 0) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
        <span>Loading templates...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm">
        <span>⚠️ Error loading templates: {error}</span>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="text-gray-400 text-sm">
        <span>📭 No templates available. Create one first!</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Template Selector */}
      <div className="flex flex-col gap-2">
        <label htmlFor="bioscope-template" className="text-sm font-medium text-gray-300">
          🎬 Select Bioscope Template
        </label>
        <select
          id="bioscope-template"
          value={selectedTemplate?.id || ''}
          onChange={handleSelectTemplate}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">-- Choose a template --</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.rounds?.length || 0} rounds)
            </option>
          ))}
        </select>
      </div>

      {/* Template Preview */}
      {selectedTemplate && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">{selectedTemplate.name}</h3>
              {selectedTemplate.description && (
                <p className="text-sm text-gray-400 mt-1">{selectedTemplate.description}</p>
              )}
            </div>
            {selectedTemplate.isPublic && (
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                Public
              </span>
            )}
          </div>

          {/* Configuration Details */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-blue-400">📊</span>
              <span>{selectedTemplate.rounds?.length || 0} Rounds</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-yellow-400">⏱️</span>
              <span>{selectedTemplate.configuration?.timer_seconds || 30}s Timer</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-purple-400">🖼️</span>
              <span>
                {selectedTemplate.rounds?.[0]?.images?.length || 0}-
                {Math.max(...(selectedTemplate.rounds?.map((r) => r.images?.length || 0) || [0]))} Images
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-300">
              <span className="text-green-400">🎵</span>
              <span>{selectedTemplate.configuration?.timer_sound_enabled ? 'Sound On' : 'Sound Off'}</span>
            </div>
          </div>

          {/* Rounds Preview */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-400 uppercase">Rounds Preview</p>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {selectedTemplate.rounds?.slice(0, 5).map((round, index) => (
                <div
                  key={round.round_id}
                  className="flex items-center justify-between text-sm bg-gray-900/50 px-3 py-2 rounded"
                >
                  <span className="text-gray-300">
                    {index + 1}. {round.title}
                  </span>
                  <span className="text-gray-500 text-xs">
                    {round.images?.length || 0} images
                  </span>
                </div>
              ))}
              {(selectedTemplate.rounds?.length || 0) > 5 && (
                <p className="text-xs text-gray-500 text-center">
                  +{(selectedTemplate.rounds?.length || 0) - 5} more rounds
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
