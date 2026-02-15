import React, { useEffect, useState } from "react";
import { useLocation } from 'react-router-dom';
import { FaShieldAlt, FaEdit, FaTrash, FaLayerGroup, FaFileAlt, FaFolderOpen } from 'react-icons/fa';
import "./Policy.scss";
import { storage } from "../utils/storage";
import { STORAGE_KEYS, API_BASE_URL } from "../utils/constants";
import session from "../utils/session";
import { formatDateISO } from '../utils/date';
import useConfirm from '../hooks/useConfirm';

const Policy = () => {
  const [text, setText] = useState("");
  const [policies, setPolicies] = useState([]);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  // selectedGroup removed — not used in current UI
  const [groupName, setGroupName] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);
  const [filterGroup, setFilterGroup] = useState("all");

  // Normalize and dedupe policies by server _id when present, otherwise by local id.
  const normalizePolicies = (arr) => {
    if (!Array.isArray(arr)) return [];
    const map = new Map();
    for (const p of arr) {
      if (!p || typeof p !== 'object') continue;
      const key = p._id ? `id:${p._id}` : p.id ? `local:${p.id}` : `idx:${Math.random()}`;
      map.set(key, p);
    }
    return Array.from(map.values());
  };

  useEffect(() => {
    const load = async () => {
      try {
        const token = session.getToken();
        if (token) {
          const res = await fetch(`${API_BASE_URL}/policy`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              setPolicies(normalizePolicies(data));
              return;
            }
          }
        }
      } catch (e) {
        // ignore and fall back to local
      }
      const saved = storage.getJSON(STORAGE_KEYS.POLICY, []);
      if (Array.isArray(saved)) setPolicies(normalizePolicies(saved));
    };
    load();
  }, []);

  const confirm = useConfirm();

  const location = useLocation();

  useEffect(() => {
    if (location?.state?.openAdd) {
      toggleForm();
      try { window.history.replaceState({}, document.title); } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = (next) => {
    setPolicies(normalizePolicies(next));
    // Try server sync for the full list when possible. This is best-effort.
    (async () => {
      try {
        const token = session.getToken();
        if (!token) {
    try { storage.setJSONAndSync(STORAGE_KEYS.POLICY, next); } catch (e) {}
          return;
        }
        // Only sync items that already have a server-side `_id`.
        // New/local items (which only have `id`) are created via the explicit
        // add flow (handleAdd) to avoid PUTting to numeric/local IDs which
        // the server may not recognise and which caused 500s.
        for (const item of next) {
          if (!item || typeof item !== 'object') continue;
          // Only attempt to update server-side items
          const serverId = item._id || null;
          if (!serverId) continue;
          try {
            await fetch(`${API_BASE_URL}/policy/${encodeURIComponent(serverId)}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify(item),
            });
          } catch (e) {
            // ignore per-item errors
          }
        }
      } catch (e) {
        try { storage.setJSONAndSync(STORAGE_KEYS.POLICY, next); } catch (err) {}
      }
    })();
  };

  const handleAdd = () => {
    const trimmed = (text || "").trim();
    if (!trimmed) return;

    // If editing an existing entry
    if (editingIndex > -1) {
      const next = [...policies];
      next[editingIndex] = {
        ...next[editingIndex],
        content: trimmed,
        group: groupName.trim() || "Uncategorized",
        updatedAt: formatDateISO(new Date()),
      };
      // Optimistic update + server update
      persist(next);
      (async () => {
        try {
          const token = session.getToken();
          if (!token) return;
          const id = next[editingIndex]._id || next[editingIndex].id;
          await fetch(`${API_BASE_URL}/policy/${encodeURIComponent(id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(next[editingIndex]),
          });
        } catch (e) {}
      })();
      setEditingIndex(-1);
      setText("");
      setGroupName("");
      return;
    }

    // Add new entry
    const newItem = {
      id: Date.now(),
      content: trimmed,
      group: groupName.trim() || "Uncategorized",
      createdAt: formatDateISO(new Date()),
    };
    const next = [newItem, ...policies];
    // Optimistic add + server create
    persist(next);
    (async () => {
      try {
        const token = session.getToken();
        if (!token) return;
        const res = await fetch(`${API_BASE_URL}/policy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(newItem),
        });
        if (res.ok) {
          const created = await res.json();
          setPolicies((prev) => normalizePolicies(prev.map((p) => (p.id === newItem.id ? created : p))));
        }
      } catch (e) {}
    })();
    setText("");
    setGroupName("");
  };

  const handleDelete = async (id) => {
    const policy = policies.find((p) => (p._id ? String(p._id) === String(id) : p.id === id));
    const preview = policy && policy.content ? `${String(policy.content).slice(0, 120)}${(policy.content.length||0) > 120 ? '...' : ''}` : '';
    const ok = await confirm(`Delete this term${preview ? `: "${preview}"` : ''}?`);
    if (!ok) return;

    const next = policies.filter((p) => {
      if (p._id) return String(p._id) !== String(id);
      return p.id !== id;
    });

    // Optimistic UI update
    setPolicies(normalizePolicies(next));

    try {
      const token = session.getToken();
      // If this item was never created on the server (no `_id`), don't
      // attempt a server DELETE — just persist locally. This prevents
      // sending numeric/local ids (Date.now()) to the API which return 500.
      if (!policy || !policy._id) {
        try { persist(next); } catch (e) {}
        return;
      }

      if (!token) {
        // No auth token — persist locally (best-effort)
        try { persist(next); } catch (e) {}
        return;
      }

      // Attempt server delete first to avoid re-creating the item during upserts
      const res = await fetch(`${API_BASE_URL}/policy/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        // Server failed to delete — reload from server to restore canonical state
        try {
          const reload = await fetch(`${API_BASE_URL}/policy`, { headers: { Authorization: `Bearer ${token}` } });
          if (reload.ok) {
            const data = await reload.json();
            if (Array.isArray(data)) setPolicies(normalizePolicies(data));
          }
        } catch (e) {
          // ignore reload errors
        }
        return;
      }

      // Delete succeeded on server — persist remaining items to ensure server has them
      persist(next);
    } catch (e) {
      // Network or unexpected error — try to recover by reloading server state if possible
      try {
        const token = session.getToken();
        if (token) {
          const reload = await fetch(`${API_BASE_URL}/policy`, { headers: { Authorization: `Bearer ${token}` } });
          if (reload.ok) {
            const data = await reload.json();
            if (Array.isArray(data)) setPolicies(normalizePolicies(data));
          }
        } else {
          persist(next);
        }
      } catch (err) {
        // swallow
      }
    }
  };

  const handleEdit = (id) => {
    const index = policies.findIndex((p) => (p._id ? String(p._id) === String(id) : p.id === id));
    if (index === -1) return;
    setEditingIndex(index);
    setText(policies[index].content || "");
    const grp = policies[index].group || "Uncategorized";
    setGroupName(grp);
    setSelectedGroup(grp);
    setShowNewGroupInput(false);
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingIndex(-1);
    setText("");
    setGroupName("");
    setSelectedGroup("");
    setShowNewGroupInput(false);
    setShowForm(false);
  };

  const toggleForm = () => {
    setEditingIndex(-1);
    setText("");
    // Default to first existing group when opening the form, or Uncategorized
    const groups = getGroups();
    const defaultGroup = groups && groups.length ? groups[0] : "Uncategorized";
    setSelectedGroup(defaultGroup);
    setGroupName(defaultGroup);
    setShowNewGroupInput(false);
    setShowForm((s) => !s);
  };

  const onGroupSelectChange = (e) => {
    const val = e.target.value;
    if (val === "__new") {
      setSelectedGroup("__new");
      setShowNewGroupInput(true);
      setGroupName("");
    } else {
      setSelectedGroup(val);
      setShowNewGroupInput(false);
      setGroupName(val);
    }
  };

  // Get unique groups from policies
  const getGroups = () => {
    const groups = new Set(policies.map(p => p.group || "Uncategorized"));
    return Array.from(groups).sort();
  };

  // Get filtered policies
  const getFilteredPolicies = () => {
    return policies.filter((p) => {
      const matchesSearch = (p.content || "").toLowerCase().includes(search.toLowerCase()) ||
                           (p.group || "").toLowerCase().includes(search.toLowerCase());
      const matchesGroup = filterGroup === "all" || (p.group || "Uncategorized") === filterGroup;
      return matchesSearch && matchesGroup;
    });
  };

  // Group policies by group name
  const getGroupedPolicies = () => {
    const filtered = getFilteredPolicies();
    const grouped = {};
    filtered.forEach(policy => {
      const group = policy.group || "Uncategorized";
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(policy);
    });
    return grouped;
  };

  // Calculate stats
  const totalTerms = policies.length;
  const totalGroups = getGroups().length;
  const ungroupedCount = policies.filter(p => !p.group || p.group === 'Uncategorized').length;

  return (
    <div className="page policy-page">
      <div className="page-header">
        <div className="page-header-left">
          <h2><FaShieldAlt />Terms & Conditions Policy</h2>
          <p className="subtitle">Manage all your terms and conditions policies</p>
        </div>
        <div className="page-header-actions">
          <button className="btn-primary" onClick={toggleForm}>+ Add Term</button>
        </div>
      </div>

      {/* Stats Section */}
      <div className="policy-stats">
        <div className="policy-stat-card">
          <div className="policy-stat-icon policy-stat-icon--total">
            <FaFileAlt />
          </div>
          <div className="policy-stat-info">
            <h3>{totalTerms}</h3>
            <p>Total Terms</p>
          </div>
        </div>
        <div className="policy-stat-card">
          <div className="policy-stat-icon policy-stat-icon--groups">
            <FaLayerGroup />
          </div>
          <div className="policy-stat-info">
            <h3>{totalGroups}</h3>
            <p>Categories</p>
          </div>
        </div>
        <div className="policy-stat-card">
          <div className="policy-stat-icon policy-stat-icon--ungrouped">
            <FaFolderOpen />
          </div>
          <div className="policy-stat-info">
            <h3>{ungroupedCount}</h3>
            <p>Uncategorized</p>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="policy-form">
        <label htmlFor="groupSelect">
          Group/Category
        </label>
        <select id="groupSelect" className="group-select" value={selectedGroup} onChange={onGroupSelectChange}>
          <option value="">-- Select group --</option>
          {getGroups().map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
          <option value="__new">+ Create new group...</option>
        </select>

        {showNewGroupInput && (
          <input
            type="text"
            id="groupName"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g., Wedding Policy, Engagement Policy, Corporate Events..."
            className="group-input"
          />
        )}
        
        <label htmlFor="policyText">
          {editingIndex > -1 ? "Edit Term" : "Enter Terms & Conditions"}
        </label>
        <textarea
          id="policyText"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Write terms and conditions here..."
          rows={6}
        />

        <div className="policy-actions">
          <div className="left-action">
            <button className="btn btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          </div>
          <div className="right-action">
            <button className="btn btn-primary" onClick={handleAdd}>
              {editingIndex > -1 ? "Update" : "Add Term"}
            </button>
          </div>
        </div>
        </div>
      )}

      <div className="policy-list">
        <div className="policy-list-header">
          <h3>Saved Terms & Conditions</h3>
          <div className="filter-controls">
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="group-filter"
            >
              <option value="all">All Groups</option>
              {getGroups().map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
            <div className="search-wrap">
              <input
                type="search"
                placeholder="Search terms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="policy-search"
              />
            </div>
          </div>
        </div>
        {policies.length === 0 ? (
          <div className="empty-state">
            <p>No terms and conditions added yet.</p>
            <p className="muted">
              Use the form above to add your first term.
            </p>
          </div>
        ) : getFilteredPolicies().length === 0 ? (
          <div className="empty-state">
            <p>No terms match your search or filter.</p>
            <p className="muted">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="grouped-policies">
            {Object.entries(getGroupedPolicies()).map(([groupName, groupPolicies]) => (
              <div key={groupName} className="policy-group">
                <div className="group-header">
                  <h4 className="group-name">{groupName}</h4>
                  <span className="group-count">{groupPolicies.length} term{groupPolicies.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="table-wrap">
                  <table className="policy-table">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Content</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupPolicies.map((p, idx) => (
                        <tr key={p._id || p.id}>
                          <td>{idx + 1}</td>
                          <td>
                            <div className="policy-content">{p.content}</div>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="btn-icon btn-edit"
                                onClick={() => handleEdit(p._id || p.id)}
                                title="Edit"
                              >
                                <FaEdit />
                              </button>
                              <button
                                className="btn-icon btn-delete"
                                onClick={() => handleDelete(p._id || p.id)}
                                title="Delete"
                              >
                                <FaTrash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Policy;
