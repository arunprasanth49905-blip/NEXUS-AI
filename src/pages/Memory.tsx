import React, { useState, useEffect, useCallback } from 'react';
import { 
  Bookmark, 
  Search, 
  Trash2, 
  Plus, 
  RefreshCw, 
  ShieldCheck, 
  Clock, 
  Info 
} from 'lucide-react';
import { PageHeader } from '../components/common/PageHeader';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { MemoryRecord, MemoryType } from '../types';
import { api } from '../services/api';
import './Memory.css';

export interface MemoryProps {
  onAddToast: (title: string, description?: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const Memory: React.FC<MemoryProps> = ({ onAddToast }) => {
  const [memories, setMemories] = useState<MemoryRecord[]>([]);
  const [filterType, setFilterType] = useState<MemoryType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<MemoryType>('PROJECT');
  const [isAdding, setIsAdding] = useState(false);

  const loadMemories = useCallback(async () => {
    setIsLoading(true);
    try {
      const typeParam = filterType === 'ALL' ? undefined : filterType;
      const res = await api.getMemories(typeParam);
      setMemories(res.memories);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load memories';
      onAddToast('Memory Error', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filterType, onAddToast]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      loadMemories();
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.searchMemories(searchQuery.trim());
      setMemories(res.memories.map((m) => m.memory));
      onAddToast('Search Complete', `Found ${res.total_found} relevant memories using deterministic ranking.`, 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Search failed';
      onAddToast('Search Error', msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      const res = await api.saveMemory({
        content: newContent.trim(),
        memory_type: newType,
      });
      onAddToast('Memory Saved', res.reason, 'success');
      setNewContent('');
      setIsAdding(false);
      loadMemories();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save memory';
      onAddToast('Storage Rejected', msg, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMemory(id);
      setMemories((prev) => prev.filter((m) => m.memory_id !== id));
      onAddToast('Memory Deleted', 'Record permanently removed from storage.', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete';
      onAddToast('Delete Error', msg, 'error');
    }
  };

  const handleClearSession = async () => {
    try {
      const res = await api.clearSessionMemory();
      onAddToast('Session Memory Cleared', `Removed ${res.deleted_count} ephemeral records.`, 'success');
      loadMemories();
    } catch {
      onAddToast('Error', 'Could not clear session memory.', 'error');
    }
  };

  const handleClearProject = async () => {
    try {
      const res = await api.clearProjectMemory();
      onAddToast('Project Memory Cleared', `Removed ${res.deleted_count} project records.`, 'success');
      loadMemories();
    } catch {
      onAddToast('Error', 'Could not clear project memory.', 'error');
    }
  };

  return (
    <div className="nexus-memory-page animate-fade-in">
      <PageHeader
        title="MEMORY CENTER"
        subtitle="Transparent context retention. Inspect what NEXUS remembers, why it was stored, and manage retention policies."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw size={14} />}
              onClick={loadMemories}
              isLoading={isLoading}
            >
              Sync
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus size={14} />}
              onClick={() => setIsAdding((prev) => !prev)}
            >
              Add Memory
            </Button>
          </div>
        }
      />

      {/* Privacy Notice Banner */}
      <div className="nexus-memory-privacy-banner">
        <ShieldCheck size={18} className="text-cyan flex-shrink-0" />
        <div className="nexus-memory-privacy-text">
          <strong>Privacy Guard & Secret Protection Active:</strong> NEXUS inspects memory candidates for sensitive patterns (passwords, private keys, API tokens) and rejects or redacts them automatically. No memory data is sent to external clouds.
        </div>
      </div>

      {/* Create Memory Form (Collapsible) */}
      {isAdding && (
        <Card variant="elevated" padding="md" className="nexus-create-memory-card animate-fade-in">
          <form onSubmit={handleCreateMemory} className="nexus-create-memory-form">
            <h3 className="nexus-card-title">Retain New Memory</h3>
            <textarea
              className="nexus-memory-textarea"
              placeholder="Enter factual preference or project detail (e.g., 'Production database uses Postgres', 'Prefer concise TypeScript examples')..."
              rows={3}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              required
            />
            <div className="nexus-create-memory-footer">
              <div className="flex items-center gap-2">
                <label className="text-xs text-secondary font-medium">Memory Type:</label>
                <select
                  className="nexus-memory-select"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as MemoryType)}
                >
                  <option value="PROJECT">Project Memory (Enduring project detail)</option>
                  <option value="LONG_TERM">Long-Term Memory (User preference)</option>
                  <option value="SESSION">Session Memory (Current task)</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save to Repository
                </Button>
              </div>
            </div>
          </form>
        </Card>
      )}

      {/* Search & Filter Toolbar */}
      <div className="nexus-memory-toolbar">
        <form onSubmit={handleSearch} className="nexus-memory-search-form">
          <Search size={15} className="nexus-search-icon" />
          <input
            type="text"
            className="nexus-memory-search-input"
            placeholder="Search memories by keyword, entity, or task goal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="nexus-search-clear-btn"
              onClick={() => { setSearchQuery(''); loadMemories(); }}
            >
              Clear
            </button>
          )}
        </form>

        <div className="nexus-memory-type-filters">
          {(['ALL', 'PROJECT', 'LONG_TERM', 'SESSION'] as const).map((type) => (
            <button
              key={type}
              type="button"
              className={`nexus-type-pill ${filterType === type ? 'nexus-type-pill-active' : ''}`}
              onClick={() => setFilterType(type)}
            >
              {type === 'ALL' ? 'All Types' : type.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="nexus-bulk-actions">
          <button
            type="button"
            className="nexus-danger-link-btn"
            onClick={handleClearSession}
            title="Clear all ephemeral session memories"
          >
            Clear Session
          </button>
          <button
            type="button"
            className="nexus-danger-link-btn"
            onClick={handleClearProject}
            title="Clear all project memories"
          >
            Clear Project
          </button>
        </div>
      </div>

      {/* Memory Cards Grid */}
      <div className="nexus-memory-list" role="feed" aria-label="Stored memories">
        {memories.length === 0 ? (
          <div className="nexus-empty-memory-state">
            <Bookmark size={36} className="text-tertiary" />
            <h3 className="nexus-empty-title">No Saved Memories in this View</h3>
            <p className="nexus-empty-desc">
              NEXUS only retains information with high relevance or upon explicit request. You can add enduring project constraints or preferences above.
            </p>
          </div>
        ) : (
          memories.map((mem) => (
            <div key={mem.memory_id} className="nexus-memory-card animate-fade-in">
              <div className="nexus-memory-card-header">
                <div className="flex items-center gap-2">
                  <span className={`nexus-mem-type-tag nexus-tag-${mem.memory_type.toLowerCase()}`}>
                    {mem.memory_type.replace('_', ' ')}
                  </span>
                  <span className="nexus-mem-source-tag">Source: {mem.source}</span>
                </div>
                <button
                  type="button"
                  className="nexus-mem-delete-btn"
                  onClick={() => handleDelete(mem.memory_id)}
                  title="Permanently remove memory"
                  aria-label="Delete memory"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="nexus-memory-card-body">
                <p className="nexus-memory-content-text">{mem.content}</p>
              </div>

              <div className="nexus-memory-card-footer">
                <div className="nexus-mem-provenance">
                  <Info size={11} className="text-secondary flex-shrink-0" />
                  <span><strong>Why Retained:</strong> {mem.provenance.reasonStored}</span>
                </div>
                <div className="nexus-mem-time">
                  <Clock size={11} />
                  <span>{new Date(mem.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
