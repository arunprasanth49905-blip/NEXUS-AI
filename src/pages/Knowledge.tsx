import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  FileText, 
  Code, 
  FileCode2, 
  Trash2, 
  Info, 
  Search,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { EmptyState } from '../components/ui/EmptyState';
import type { KnowledgeItem } from '../types';
import './Knowledge.css';

export interface KnowledgeProps {
  onAddToast: (title: string, description?: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const Knowledge: React.FC<KnowledgeProps> = ({ onAddToast }) => {
  const [items, setItems] = useState<KnowledgeItem[]>([
    {
      id: 'k-1',
      title: 'NEXUS_EDGE_Architecture_Spec.md',
      type: 'document',
      description: 'System specifications for Phase 1 Product Foundation and local edge boundaries.',
      size: '24.8 KB',
      updatedAt: 'Today, 09:12 AM',
      isSample: true,
    },
    {
      id: 'k-2',
      title: 'edge_runtime_api_contracts.ts',
      type: 'code',
      description: 'TypeScript contract interfaces for health, diagnostics, and context telemetry.',
      size: '12.4 KB',
      updatedAt: 'Yesterday, 03:45 PM',
      isSample: true,
    },
    {
      id: 'k-3',
      title: 'Local Privacy & Telemetry Guardrails',
      type: 'note',
      description: 'Policies defining strict offline execution and zero remote data relay rules.',
      size: '4.2 KB',
      updatedAt: 'Sep 24, 2026',
      isSample: true,
    },
  ]);

  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Add modal state
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'document' | 'code' | 'note' | 'dataset'>('document');
  const [newDescription, setNewDescription] = useState('');

  const filteredItems = items.filter((item) => {
    const matchesFilter = filterType === 'all' || item.type === filterType;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAddItem = (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    if (!newTitle.trim()) return;

    const newItem: KnowledgeItem = {
      id: `k-${Date.now()}`,
      title: newTitle.trim(),
      type: newType,
      description: newDescription.trim() || 'User registered workspace knowledge item.',
      size: 'Local ref',
      updatedAt: 'Just now',
      isSample: false,
    };

    setItems((prev) => [newItem, ...prev]);
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewDescription('');
    onAddToast('Knowledge source registered', `"${newItem.title}" added to local workspace reference.`, 'success');
  };

  const handleDeleteItem = (id: string, title: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    onAddToast('Knowledge item removed', `"${title}" was removed from the local workspace.`, 'info');
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'document':
        return <FileText size={18} className="text-cyan" />;
      case 'code':
        return <Code size={18} className="text-blue" />;
      case 'note':
        return <FileCode2 size={18} className="text-purple" />;
      default:
        return <BookOpen size={18} className="text-secondary" />;
    }
  };

  return (
    <div className="nexus-knowledge-page animate-fade-in">
      <PageHeader
        title="KNOWLEDGE"
        subtitle="Your project knowledge, documents, and useful information."
        actions={
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus size={16} />}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Knowledge
          </Button>
        }
      />

      {/* RAG Disclosure Banner */}
      <div className="nexus-knowledge-notice" role="note">
        <Info size={16} className="nexus-notice-icon" />
        <div className="nexus-notice-body">
          <span className="nexus-notice-title">Phase 1 Foundation Note</span>
          <p className="nexus-notice-desc">
            In Phase 1, knowledge sources are registered as local workspace references.
            Semantic vector embeddings and autonomous RAG indexing will be introduced in Phase 4 (Context & Memory).
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="nexus-knowledge-toolbar">
        <div className="nexus-filter-chips" role="tablist" aria-label="Knowledge categories">
          {[
            { id: 'all', label: 'All Sources' },
            { id: 'document', label: 'Documents' },
            { id: 'code', label: 'Code' },
            { id: 'note', label: 'Notes' },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              role="tab"
              aria-selected={filterType === chip.id}
              className={`nexus-filter-chip ${filterType === chip.id ? 'nexus-chip-active' : ''}`}
              onClick={() => setFilterType(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="nexus-knowledge-search">
          <Search size={14} className="nexus-knowledge-search-icon" />
          <input
            type="text"
            className="nexus-knowledge-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search knowledge sources..."
            aria-label="Search knowledge sources"
          />
        </div>
      </div>

      {/* Knowledge Item Grid / Empty State */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={24} />}
          title="No knowledge sources added yet."
          description="Register local documentation, code references, or project notes to provide context for upcoming phases."
          actionLabel="Add knowledge"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="nexus-knowledge-grid">
          {filteredItems.map((item) => (
            <Card key={item.id} variant="default" padding="md" className="nexus-knowledge-card">
              <div className="nexus-k-header">
                <div className="nexus-k-icon-wrap">{getItemIcon(item.type)}</div>
                <div className="nexus-k-titles">
                  <div className="nexus-k-title-line">
                    <h3 className="nexus-k-title">{item.title}</h3>
                    {item.isSample && (
                      <span className="nexus-demo-badge" title="Reference demonstration file">
                        Sample
                      </span>
                    )}
                  </div>
                  <span className="nexus-k-type">{item.type.toUpperCase()}</span>
                </div>
                <button
                  type="button"
                  className="nexus-k-delete-btn"
                  onClick={() => handleDeleteItem(item.id, item.title)}
                  title="Remove from knowledge workspace"
                  aria-label={`Remove ${item.title}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <p className="nexus-k-desc">{item.description}</p>

              <div className="nexus-k-footer">
                <span className="nexus-k-meta">{item.size} • Updated {item.updatedAt}</span>
                <span className="nexus-k-status-pill">
                  <CheckCircle2 size={11} className="text-green" />
                  <span>Phase 1 Registered</span>
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Knowledge Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Knowledge Source"
        subtitle="Register a document or note reference to your local workspace."
        footer={
          <>
            <Button variant="ghost" size="md" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={!newTitle.trim()}
              onClick={() => handleAddItem()}
            >
              Add Source
            </Button>
          </>
        }
      >
        <form onSubmit={handleAddItem} className="nexus-add-k-form">
          <Input
            label="Source Title or Filename"
            placeholder="e.g., project_spec.md or api_reference.ts"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            required
            autoFocus
          />

          <div className="nexus-form-field">
            <label className="nexus-form-label">Source Type</label>
            <div className="nexus-type-selector">
              {(['document', 'code', 'note'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`nexus-type-btn ${newType === type ? 'nexus-type-btn-active' : ''}`}
                  onClick={() => setNewType(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="nexus-form-field">
            <label className="nexus-form-label">Description or Notes</label>
            <textarea
              className="nexus-form-textarea"
              placeholder="Brief summary of this knowledge source..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="nexus-modal-privacy-callout">
            <ShieldCheck size={14} className="text-cyan" />
            <span>Files remain strictly local on your device. Zero external cloud uploads.</span>
          </div>
        </form>
      </Modal>
    </div>
  );
};
