'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { PERMISSIONS } from '@/lib/permissions';
import Link from 'next/link';
import { MapPin, Plus, Pencil, Trash2, RotateCcw, Check, X } from 'lucide-react';

interface Location {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  _count?: {
    labels: number;
  };
}

export default function LocationsPage() {
  const { isAuthenticated, isLoading: authLoading, hasPermission } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManageLocations = hasPermission(PERMISSIONS.LOCATION_CREATE);

  useEffect(() => {
    if (isAuthenticated && hasPermission(PERMISSIONS.LOCATION_VIEW)) {
      fetchLocations();
    }
  }, [isAuthenticated, hasPermission]);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/locations?includeInactive=true&withCounts=true');
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      const data = await response.json();
      setLocations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch locations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocationName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLocationName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create location');
      }

      setNewLocationName('');
      setShowCreateForm(false);
      fetchLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update location');
      }

      setEditingId(null);
      setEditName('');
      fetchLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (location: Location) => {
    setError(null);

    try {
      const response = await fetch(`/api/locations/${location.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !location.isActive }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update location');
      }

      fetchLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update location');
    }
  };

  const handleDelete = async (location: Location) => {
    if (!confirm(`Are you sure you want to delete "${location.name}"? This cannot be undone.`)) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(`/api/locations/${location.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete location');
      }

      fetchLocations();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete location');
    }
  };

  const startEditing = (location: Location) => {
    setEditingId(location.id);
    setEditName(location.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName('');
  };

  if (authLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please log in to view this page.</p>
          <Link href="/login" className="text-primary hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  if (!hasPermission(PERMISSIONS.LOCATION_VIEW)) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-destructive">
          You do not have permission to view locations.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <MapPin className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Locations</h1>
        </div>
        {canManageLocations && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded hover:bg-primary"
          >
            <Plus className="h-4 w-4" />
            Add Location
          </button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-right">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {showCreateForm && (
        <div className="bg-card rounded-lg shadow p-4 mb-6">
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              type="text"
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              placeholder="New location name"
              className="flex-1 px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
            <button
              type="submit"
              disabled={isSubmitting || !newLocationName.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewLocationName('');
              }}
              className="px-4 py-2 border rounded hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">Loading locations...</div>
      ) : (
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Labels
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                {canManageLocations && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {locations.map((location) => (
                <tr key={location.id} className={!location.isActive ? 'bg-muted opacity-60' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingId === location.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-ring"
                          autoFocus
                        />
                        <button
                          onClick={() => handleUpdate(location.id)}
                          disabled={isSubmitting || !editName.trim()}
                          className="p-1 text-emerald-500 hover:text-emerald-500 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="p-1 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{location.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {location._count?.labels ?? 0} labels
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {location.isDefault ? (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-primary/10 text-primary">
                        Default
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded bg-muted text-foreground">
                        Custom
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        location.isActive
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'bg-destructive/10 text-destructive'
                      }`}
                    >
                      {location.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  {canManageLocations && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        {editingId !== location.id && (
                          <button
                            onClick={() => startEditing(location)}
                            className="p-1 text-primary hover:text-primary"
                            title="Rename"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleToggleActive(location)}
                          className={`p-1 ${
                            location.isActive
                              ? 'text-amber-500 hover:text-amber-500'
                              : 'text-emerald-500 hover:text-emerald-500'
                          }`}
                          title={location.isActive ? 'Deactivate' : 'Reactivate'}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                        {!location.isDefault && (location._count?.labels ?? 0) === 0 && (
                          <button
                            onClick={() => handleDelete(location)}
                            className="p-1 text-destructive hover:text-destructive"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {locations.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-muted-foreground">
                    No locations found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 text-sm text-muted-foreground">
        <p><strong>Note:</strong> Default locations cannot be deleted. Locations with assigned labels can only be deactivated, not deleted.</p>
      </div>
    </div>
  );
}
