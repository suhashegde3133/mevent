import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FaPlus, FaSearch, FaFilter, FaTimes, FaProjectDiagram } from 'react-icons/fa';
import { useForm } from 'react-hook-form';
import Modal from '../components/Modal/Modal';
import useConfirm from '../hooks/useConfirm';
import { API_BASE_URL } from '../utils/constants';
import session from '../utils/session';
import './Projects.scss';
import { useDispatch } from 'react-redux';
import { setProjects as setProjectsAction } from '../redux/slices/projectsSlice';
import { formatDateDisplay } from '../utils/date';

const Projects = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { register: registerEdit, handleSubmit: handleSubmitEdit, setValue, formState: { errors: errorsEdit } } = useForm();

  const location = useLocation();

  // Open add modal when navigated from dashboard with state.openAdd === true
  useEffect(() => {
    if (location?.state?.openAdd) {
      setShowAddModal(true);
      // Clear the navigation state to avoid reopening on back/refresh
      try {
        window.history.replaceState({}, document.title);
      } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Projects are loaded from backend only (no local/temporary storage)
  const [projects, setProjects] = useState([]);

  const dispatch = useDispatch();
  const confirm = useConfirm();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Reusable function to refresh projects from server
  const refreshProjectsFromServer = async () => {
    try {
      const token = session.getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/projects`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
        dispatch(setProjectsAction(data));
      }
    } catch (e) {
      console.error('Failed to refresh projects:', e);
    }
  };

  // Publish initial mock projects into Redux so other pages (Dashboard) can read live stats
  useEffect(() => {
    dispatch(setProjectsAction(projects));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load projects from server when authenticated
  useEffect(() => {
    const load = async () => {
      try {
        const token = session.getToken();
        if (!token) {
          setProjects([]);
          dispatch(setProjectsAction([]));
          return;
        }
        const res = await fetch(`${API_BASE_URL}/projects`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) {
          setProjects([]);
          dispatch(setProjectsAction([]));
          return;
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setProjects(data);
          dispatch(setProjectsAction(data));
          return;
        }
      } catch (e) {
        // ignore
        setProjects([]);
        dispatch(setProjectsAction([]));
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter and search logic
  const filteredProjects = projects.filter((project) => {
    const q = (searchTerm || '').toString().trim().toLowerCase();
    const name = (project?.name || '').toString().toLowerCase();
    const client = (project?.client || '').toString().toLowerCase();
    const matchesSearch = q === '' || name.includes(q) || client.includes(q);
    const matchesFilter = filterStatus === 'all' || project.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  // Handle add new project (use backend as source of truth)
  const handleAddProject = async (data) => {
    const payload = {
      name: data.projectName,
      client: data.clientName,
      status: data.status,
      photos: 0,
      deadline: data.deadline,
      description: data.description || '',
    };

    setShowAddModal(false);
    reset();

    try {
      const token = session.getToken();
      if (!token) {
        alert('You must be signed in to create a project.');
        return;
      }
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        // Refresh from server to ensure consistency
        await refreshProjectsFromServer();
      } else {
        alert('Failed to create project.');
      }
    } catch (e) {
      console.error('Create error:', e);
      alert('Failed to create project.');
    }
  };

  // Handle view details
  const handleViewDetails = (project) => {
    setSelectedProject(project);
    setIsEditMode(false);
    setShowDetailsModal(true);
    // Pre-fill form values for editing
    setValue('editProjectName', project.name);
    setValue('editClientName', project.client);
    setValue('editStatus', project.status);
    setValue('editDeadline', project.deadline);
    setValue('editDescription', project.description);
  };

  // Handle delete project
  const handleDeleteProject = async (projectId) => {
    const ok = await confirm('Are you sure you want to delete this project?');
    if (!ok) return;
    
    const deleteId = selectedProject?._id || selectedProject?.id;
    setShowDetailsModal(false);
    
    try {
      const token = session.getToken();
      if (!token) {
        alert('You must be signed in to delete a project.');
        return;
      }
      const res = await fetch(`${API_BASE_URL}/projects/${encodeURIComponent(deleteId)}`, { 
        method: 'DELETE', 
        headers: { Authorization: `Bearer ${token}` } 
      });
      if (res.ok) {
        // Refresh from server to ensure consistency
        await refreshProjectsFromServer();
      } else {
        alert('Failed to delete project. Please try again.');
      }
    } catch (e) { 
      console.error('Delete error:', e);
      alert('Failed to delete project. Please check your connection.');
    }
  };

  // Handle edit project
  const handleEditProject = async (data) => {
    const updatedProject = {
      ...selectedProject,
      name: data.editProjectName,
      client: data.editClientName,
      status: data.editStatus,
      deadline: data.editDeadline,
      description: data.editDescription || '',
    };
    
    const selectedId = selectedProject?._id || selectedProject?.id;
    
    try {
      const token = session.getToken();
      if (!token) {
        alert('You must be signed in to update a project.');
        return;
      }
      // Update on server first
      const projectId = selectedProject._id || selectedProject.id;
      const res = await fetch(`${API_BASE_URL}/projects/${encodeURIComponent(projectId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(updatedProject),
      });
      if (res.ok) {
        // Refresh from server to ensure consistency
        await refreshProjectsFromServer();
        setIsEditMode(false);
        setShowDetailsModal(false);
      } else {
        alert('Failed to update project. Please try again.');
        setIsEditMode(true); // Re-enable edit mode if failed
      }
    } catch (e) { 
      console.error('Update error:', e);
      alert('Failed to update project. Please check your connection.');
      setIsEditMode(true); // Re-enable edit mode if failed
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditMode(false);
    // Reset form to original values
    setValue('editProjectName', selectedProject.name);
    setValue('editClientName', selectedProject.client);
    setValue('editStatus', selectedProject.status);
    setValue('editDeadline', selectedProject.deadline);
    setValue('editDescription', selectedProject.description);
  };

  return (
    <div className="projects">
      <div className="projects__header">
        <div>
          <h1 className="projects__title"><FaProjectDiagram style={{ marginRight: '0.5rem' }} />Projects</h1>
          <p className="projects__subtitle">Manage and track all your business projects</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          <FaPlus /> New Project
        </button>
      </div>

      <div className="projects__filters">
        <div className="search-bar">
          <FaSearch />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="clear-btn" onClick={() => setSearchTerm('')}>
              <FaTimes />
            </button>
          )}
        </div>
        <div className="filter-group">
          <FaFilter />
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="planning">Planning</option>
            <option value="in_progress">In Progress</option>
            <option value="editing">Editing</option>
            <option value="review">Review</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="projects__results">
        Showing {paginatedProjects.length > 0 ? startIndex + 1 : 0}-{Math.min(startIndex + itemsPerPage, filteredProjects.length)} of {filteredProjects.length} projects
      </div>

      {/* Projects Grid */}
      <div className="projects__grid">
        {paginatedProjects.length > 0 ? (
          paginatedProjects.map((project) => (
            <div key={project._id || project.id} className="project-card">
              <div className="project-card__header">
                <h3 className="project-card__name">{project.name}</h3>
                <span 
                  className={`project-card__status status-${project.status}`}
                >
                  {project.status.replace('_', ' ')}
                </span>
              </div>
              <div className="project-card__details">
                <p><strong>Client:</strong> {project.client}</p>
                <p><strong>Deadline:</strong> {formatDateDisplay(project.deadline)}</p>
                <p><strong>Description:</strong> {project.description || 'No description provided'}</p>
              </div>
              <button 
                className="project-card__view"
                onClick={() => handleViewDetails(project)}
              >
                View Details
              </button>
            </div>
          ))
        ) : (
          <div className="projects__empty">
            <p>No projects found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination-controls">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}

      {/* Add Project Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          reset();
        }}
        title="Add New Project"
        size="medium"
      >
        <form onSubmit={handleSubmit(handleAddProject)} className="project-form">
          <div className="form-group">
            <label htmlFor="projectName">Project Name *</label>
            <input
              id="projectName"
              type="text"
              placeholder="e.g., Wedding - Sarah & Mike"
              {...register('projectName', { required: 'Project name is required' })}
            />
            {errors.projectName && <span className="error">{errors.projectName.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="clientName">Client Name *</label>
            <input
              id="clientName"
              type="text"
              placeholder="e.g., Sarah Johnson"
              {...register('clientName', { required: 'Client name is required' })}
            />
            {errors.clientName && <span className="error">{errors.clientName.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="status">Project Status *</label>
            <select
              id="status"
              {...register('status', { required: 'Status is required' })}
            >
              <option value="">Select status...</option>
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="editing">Editing</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
            </select>
            {errors.status && <span className="error">{errors.status.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="deadline">Deadline *</label>
            <input
              id="deadline"
              type="date"
              {...register('deadline', { required: 'Deadline is required' })}
            />
            {errors.deadline && <span className="error">{errors.deadline.message}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="description"><strong>Description:</strong></label>
            <textarea
              id="description"
              rows="4"
              placeholder="Project description..."
              {...register('description')}
            />
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => {
                setShowAddModal(false);
                reset();
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Project
            </button>
          </div>
        </form>
      </Modal>

      {/* View Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedProject(null);
          setIsEditMode(false);
        }}
        title={isEditMode ? "Edit Project" : "Project Details"}
        size="large"
      >
        {selectedProject && !isEditMode && (
          <div className="project-details">
            <div className="project-details__header">
              <div>
                <h2>{selectedProject.name}</h2>
              </div>
              <span 
                className={`status-badge status-${selectedProject.status}`}
              >
                {selectedProject.status.replace('_', ' ')}
              </span>
            </div>

            <div className="project-details__grid">
              <div className="detail-item">
                <label>Client</label>
                <p>{selectedProject.client}</p>
              </div>
              <div className="detail-item">
                <label>Deadline</label>
                <p>{formatDateDisplay(selectedProject.deadline)}</p>
              </div>
            </div>

            <div className="project-details__description">
              <label><strong>Description:</strong></label>
              <p>{selectedProject.description || 'No description provided'}</p>
            </div>

            <div className="project-details__actions">
              <button 
                className="btn-danger"
                onClick={() => handleDeleteProject(selectedProject._id || selectedProject.id)}
              >
                Delete Project
              </button>
              <div className="project-details__actions-right">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => setIsEditMode(true)}
                >
                  Edit Project
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedProject && isEditMode && (
          <form onSubmit={handleSubmitEdit(handleEditProject)} className="project-form">
            <div className="form-group">
              <label htmlFor="editProjectName">Project Name *</label>
              <input
                id="editProjectName"
                type="text"
                placeholder="e.g., Wedding - Sarah & Mike"
                {...registerEdit('editProjectName', { required: 'Project name is required' })}
              />
              {errorsEdit.editProjectName && <span className="error">{errorsEdit.editProjectName.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="editClientName">Client Name *</label>
              <input
                id="editClientName"
                type="text"
                placeholder="e.g., Sarah Johnson"
                {...registerEdit('editClientName', { required: 'Client name is required' })}
              />
              {errorsEdit.editClientName && <span className="error">{errorsEdit.editClientName.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="editStatus">Project Status *</label>
              <select
                id="editStatus"
                {...registerEdit('editStatus', { required: 'Status is required' })}
              >
                <option value="">Select status...</option>
                <option value="planning">Planning</option>
                <option value="in_progress">In Progress</option>
                <option value="editing">Editing</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
                <option value="delivered">Delivered</option>
              </select>
              {errorsEdit.editStatus && <span className="error">{errorsEdit.editStatus.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="editDeadline">Deadline *</label>
              <input
                id="editDeadline"
                type="date"
                {...registerEdit('editDeadline', { required: 'Deadline is required' })}
              />
              {errorsEdit.editDeadline && <span className="error">{errorsEdit.editDeadline.message}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="editDescription"><strong>Description:</strong></label>
              <textarea
                id="editDescription"
                rows="4"
                placeholder="Project description..."
                {...registerEdit('editDescription')}
              />
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save Changes
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Projects;
