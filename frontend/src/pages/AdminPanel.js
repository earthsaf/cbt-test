// Core Admin Panel with all essential features restored
import React, { useState, useEffect } from 'react';
import { 
  AppBar, Tabs, Tab, Box, Typography, Button, TextField, Select, 
  MenuItem, Snackbar, Alert, Dialog, DialogTitle, DialogContent, 
  DialogActions, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Paper, IconButton, FormControl, InputLabel, 
  Grid, Card, CardContent, Tooltip, FormGroup, FormControlLabel, 
  Switch, LinearProgress, CircularProgress, Chip
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { 
  Delete as DeleteIcon, 
  Edit as EditIcon, 
  Add as AddIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { Bar } from 'react-chartjs-2';
import { chartOptions } from '../utils/chartConfig';
import { userSelect } from '../utils/styles';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';

// Tab configuration with IDs and labels
const tabConfig = [
  { id: 'users', label: 'Users' },
  { id: 'classes', label: 'Classes' },
  { id: 'subjects', label: 'Subjects' },
  { id: 'exams', label: 'Exams' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'settings', label: 'Settings' }
];

function AdminPanel() {
  // Router and auth
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = Math.min(
    parseInt(searchParams.get('tab'), 10) || 
    parseInt(localStorage.getItem('adminActiveTab'), 10) || 
    0, 
    tabConfig.length - 1
  );
  const [tab, setTab] = useState(initialTab);
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Data states
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [exams, setExams] = useState([]);
  
  // Subject form states
  const [newSubjectName, setNewSubjectName] = useState('');
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [showDeleteSubjectConfirm, setShowDeleteSubjectConfirm] = useState(false);
  
  // Teacher assignment form states
  const [showAssignTeacher, setShowAssignTeacher] = useState(false);
  const [assignmentForm, setAssignmentForm] = useState({
    teacherId: '',
    classId: '',
    subjectId: ''
  });
  
  // UI states
  const [snack, setSnack] = useState({ open: false, message: '', severity: 'success' });
  const [editUser, setEditUser] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);
  const [analytics, setAnalytics] = useState({ results: [], highest: 0, lowest: 0, avg: 0 });

  // Filter states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [examSearch, setExamSearch] = useState('');

  // Track if component is mounted and manage request cancellation
  const isMounted = React.useRef(true);
  const abortControllerRef = React.useRef(new AbortController());

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      // Cancel any pending requests on unmount
      abortControllerRef.current.abort();
    };
  }, []);

  // Function to load all data with proper request cancellation
  const loadAllData = React.useCallback(async () => {
    if (!isMounted.current) return;
    
    // Cancel any existing requests
    abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    const startTime = Date.now();
    console.log('[AdminPanel] Starting to load admin data...');
    
    try {
      // Log which endpoints we're trying to fetch
      const endpoints = [
        '/admin/users', 
        '/admin/classes', 
        '/admin/subjects', 
        '/admin/teacher-assignments', 
        '/admin/exams'
      ];
      
      console.log('[AdminPanel] Fetching endpoints:', endpoints);
      
      // Add timestamp to prevent caching and signal for cancellation
      const timestamp = new Date().getTime();
      const signal = abortControllerRef.current.signal;
      
      // Process each response with more detailed error info
      const processResponse = (response, type) => {
        if (response.status === 'fulfilled') {
          console.log(`[AdminPanel] Successfully processed ${type} data`);
          return response.value.data;
        } else {
          const error = response.reason?.error || {};
          const status = error.response?.status || 'No status';
          const message = error.response?.data?.message || error.message || 'Unknown error';
          
          console.error(`[AdminPanel] Error loading ${type}:`, {
            status,
            message
          });
          return [];
        }
      };
      
      // Load all data in parallel with individual error handling and cancellation support
      const [usersRes, classesRes, subjectsRes, assignmentsRes, examsRes] = await Promise.allSettled([
        api.get(endpoints[0], { 
          params: { _t: timestamp },
          signal
        }).catch(err => { 
          if (err.name === 'CanceledError') {
            console.log('[AdminPanel] Users request was cancelled');
            return null;
          }
          console.error(`[AdminPanel] Error in ${endpoints[0]}:`, err.response || err);
          throw { type: 'users', error: err }; 
        }),
          
        api.get(endpoints[1], { params: { _t: timestamp } })
          .catch(err => { 
            console.error(`[AdminPanel] Error in ${endpoints[1]}:`, err.response || err);
            throw { type: 'classes', error: err }; 
          }),
          
        api.get(endpoints[2], { params: { _t: timestamp } })
          .catch(err => { 
            console.error(`[AdminPanel] Error in ${endpoints[2]}:`, err.response || err);
            throw { type: 'subjects', error: err }; 
          }),
          
        api.get(endpoints[3], { params: { _t: timestamp } })
          .catch(err => { 
            console.error(`[AdminPanel] Error in ${endpoints[3]}:`, err.response || err);
            throw { type: 'assignments', error: err }; 
          }),
          
        api.get(endpoints[4], { params: { _t: timestamp } })
          .catch(err => { 
            console.error(`[AdminPanel] Error in ${endpoints[4]}:`, err.response || err);
            throw { type: 'exams', error: err }; 
          })
      ]);
      
      // Process responses
      const usersData = processResponse(usersRes, 'users');
      const classesData = processResponse(classesRes, 'classes');
      const subjectsData = processResponse(subjectsRes, 'subjects');
      const assignmentsData = processResponse(assignmentsRes, 'assignments');
      const examsData = processResponse(examsRes, 'exams');
      
      // Update state with the fetched data if component is still mounted
      if (isMounted.current) {
        setUsers(usersData);
        setClasses(classesData);
        setSubjects(subjectsData);
        setTeacherAssignments(assignmentsData);
        setExams(examsData);
        
        console.log(`[AdminPanel] Finished loading all data in ${Date.now() - startTime}ms`);
      }
      
    } catch (error) {
      console.error('[AdminPanel] Error loading data:', {
        error,
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      
      if (isMounted.current) {
        setSnack({
          open: true,
          message: `Error loading ${error.type || 'data'}. Please try again.`,
          severity: 'error',
          autoHideDuration: 10000
        });
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);
  
  // Load data on component mount and when the tab changes
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);
  
  // Add a refresh button handler
  const handleRefresh = () => {
    console.log('[AdminPanel] Manual refresh triggered');
    loadAllData();
  };

  // Handle tab change with proper string conversion
  const handleTabChange = (event, newValue) => {
    setTab(newValue);
    localStorage.setItem('adminActiveTab', newValue.toString());
    setSearchParams({ tab: newValue.toString() });
  };

  // User management
  const handleSaveUser = async () => {
    if (!editUser) return;
    
    try {
      const isNew = !editUser.id;
      let response;
      
      if (isNew) {
        response = await api.post('/admin/users', editUser);
        setUsers([...users, response.data]);
      } else {
        response = await api.put(`/admin/users/${editUser.id}`, editUser);
        setUsers(users.map(u => u.id === editUser.id ? response.data : u));
      }
      
      setSnack({
        open: true,
        message: `User ${isNew ? 'created' : 'updated'} successfully`,
        severity: 'success'
      });
      
      setEditUser(null);
    } catch (error) {
      console.error('Error saving user:', error);
      setSnack({
        open: true,
        message: `Failed to ${editUser.id ? 'update' : 'create'} user`,
        severity: 'error'
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    setDeletingUser(true);
    try {
      await api.delete(`/admin/users/${userToDelete}`);
      setUsers(users.filter(user => user.id !== userToDelete));
      setSnack({
        open: true,
        message: 'User deleted successfully',
        severity: 'success'
      });
      
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Error deleting user:', error);
      setSnack({
        open: true,
        message: 'Failed to delete user',
        severity: 'error'
      });
    }
  };

  // Class management
  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    
    try {
      const response = await api.post('/admin/classes', { name: newClassName });
      setClasses([...classes, response.data]);
      setNewClassName('');
      
      setSnack({
        open: true,
        message: 'Class added successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error adding class:', error);
      setSnack({
        open: true,
        message: 'Failed to add class',
        severity: 'error'
      });
    }
  };

  // Exam management
  const handleFetchExamQuestions = async (examId) => {
    try {
      const response = await api.get(`/admin/exams/${examId}/questions`);
      setExamQuestions(response.data);
      setSelectedExam(exams.find(e => e.id === examId));
    } catch (error) {
      console.error('Error fetching exam questions:', error);
      setSnack({
        open: true,
        message: 'Failed to load exam questions',
        severity: 'error'
      });
    }
  };

  // Subject management
  const handleAddSubject = async () => {
    const subjectName = newSubjectName.trim();
    
    // Client-side validation
    if (!subjectName) {
      setSnack({
        open: true,
        message: 'Subject name cannot be empty',
        severity: 'error'
      });
      return;
    }
    
    // Show loading state
    setSnack({
      open: true,
      message: 'Adding subject...',
      severity: 'info',
      persist: true
    });
    
    try {
      console.log('Sending request to add subject:', { name: subjectName });
      const response = await api.post('/admin/subjects', { 
        name: subjectName 
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => status < 500 // Don't throw for 4xx errors
      });
      
      console.log('Subject creation response:', response);
      
      if (response.status === 201) {
        // Success case
        setSubjects(prev => [...prev, response.data.subject]);
        setNewSubjectName('');
        setSnack({ 
          open: true, 
          message: response.data.message || 'Subject added successfully',
          severity: 'success',
          autoHideDuration: 3000
        });
      } else if (response.status === 400) {
        // Validation or business logic error
        const errorMessage = response.data?.error || 
                           response.data?.message || 
                           'Failed to add subject. Please check the input and try again.';
        
        console.error('Validation error adding subject:', response.data);
        setSnack({
          open: true,
          message: errorMessage,
          severity: 'error',
          autoHideDuration: 10000
        });
      } else {
        // Other error cases
        throw new Error(`Unexpected status code: ${response.status}`);
      }
    } catch (error) {
      console.error('Error adding subject:', {
        error,
        response: error.response?.data,
        status: error.response?.status,
        headers: error.response?.headers
      });
      
      let errorMessage = 'Failed to add subject. Please try again later.';
      
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message.includes('Network Error')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSnack({ 
        open: true, 
        message: errorMessage,
        severity: 'error',
        autoHideDuration: 10000
      });
    }
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return;
    
    try {
      await api.delete(`/admin/subjects/${subjectToDelete.id}`);
      setSubjects(subjects.filter(s => s.id !== subjectToDelete.id));
      setShowDeleteSubjectConfirm(false);
      setSubjectToDelete(null);
      setSnack({ 
        open: true, 
        message: 'Subject deleted successfully', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Error deleting subject:', error);
      setSnack({ 
        open: true, 
        message: error.response?.data?.error || 'Failed to delete subject', 
        severity: 'error' 
      });
    }
  };

  // Teacher assignment management
  const handleAssignTeacher = async () => {
    const { teacherId, classId, subjectId } = assignmentForm;
    if (!teacherId || !classId || !subjectId) return;
    
    try {
      const response = await api.post('/admin/teacher-assignments', {
        teacherId,
        classId,
        subjectId
      });
      
      setTeacherAssignments([...teacherAssignments, response.data]);
      setShowAssignTeacher(false);
      setAssignmentForm({ teacherId: '', classId: '', subjectId: '' });
      
      setSnack({ 
        open: true, 
        message: 'Teacher assigned successfully', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Error assigning teacher:', error);
      setSnack({ 
        open: true, 
        message: error.response?.data?.error || 'Failed to assign teacher', 
        severity: 'error' 
      });
    }
  };

  const handleRemoveAssignment = async (assignmentId) => {
    try {
      await api.delete(`/admin/teacher-assignments/${assignmentId}`);
      setTeacherAssignments(teacherAssignments.filter(a => a.id !== assignmentId));
      
      setSnack({ 
        open: true, 
        message: 'Assignment removed successfully', 
        severity: 'success' 
      });
    } catch (error) {
      console.error('Error removing assignment:', error);
      setSnack({ 
        open: true, 
        message: error.response?.data?.error || 'Failed to remove assignment', 
        severity: 'error' 
      });
    }
  };

  // Filter functions
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.username?.toLowerCase().includes(userSearch.toLowerCase());
      
    const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;
    
    return matchesSearch && matchesRole;
  });

  const filteredExams = exams.filter(exam => 
    exam.title?.toLowerCase().includes(examSearch.toLowerCase()) ||
    exam.description?.toLowerCase().includes(examSearch.toLowerCase())
  );

  // Render tab panel with proper ARIA attributes
  const TabPanel = ({ children, value, index, ...other }) => {
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`admin-tabpanel-${index}`}
        aria-labelledby={`admin-tab-${index}`}
        {...other}
      >
        {value === index && (
          <Box sx={{ p: 3 }}>
            {children}
          </Box>
        )}
      </div>
    );
  };

  // Render tab content based on selected tab
  const renderTabContent = () => {
    switch (tab) {
      case 0:
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h5" component="h2" gutterBottom>
                User Management
              </Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                aria-label="Add new user"
                title="Add new user"
                onClick={() => setEditUser({
                  id: '',
                  name: '',
                  email: '',
                  username: '',
                  role: 'student',
                  classId: ''
                })}
              >
                Add User
              </Button>
            </Box>

            {/* User Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                label="Search Users"
                variant="outlined"
                size="small"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                sx={{ flex: 1 }}
              />
              <FormControl variant="outlined" size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Filter by Role</InputLabel>
                <Select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  label="Filter by Role"
                >
                  <MenuItem value="all">All Roles</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="teacher">Teacher</MenuItem>
                  <MenuItem value="student">Student</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Users Table */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Chip 
                            label={user.role} 
                            size="small"
                            color={
                              user.role === 'admin' ? 'primary' : 
                              user.role === 'teacher' ? 'secondary' : 'default'
                            }
                          />
                        </TableCell>
                        <TableCell>{user.Class?.name || 'N/A'}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit User">
                            <IconButton 
                              size="small" 
                              onClick={() => setEditUser(user)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete User">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => {
                                setUserToDelete(user.id);
                                setDeleteConfirmOpen(true);
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        No users found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );
      case 1:
        return (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h5" component="h2" gutterBottom>
                Class Management
              </Typography>
              <form onSubmit={handleAddClass} style={{ display: 'flex', gap: '8px' }}>
                <TextField
                  label="New Class Name"
                  variant="outlined"
                  size="small"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  required
                />
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary"
                  startIcon={<AddIcon />}
                >
                  Add Class
                </Button>
              </form>
            </Box>

            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Class Name</TableCell>
                    <TableCell>Student Count</TableCell>
                    <TableCell>Created At</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {classes.length > 0 ? (
                    classes.map((cls) => (
                      <TableRow key={cls.id}>
                        <TableCell>{cls.name}</TableCell>
                        <TableCell>{cls.studentCount || 0}</TableCell>
                        <TableCell>
                          {dayjs(cls.createdAt).format('MMM D, YYYY')}
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit Class">
                            <IconButton size="small">
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete Class">
                            <IconButton size="small" color="error">
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No classes found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );
      case 2:
        return (
          <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <div>
                <Typography variant="h5" gutterBottom>Subjects Management</Typography>
                <Typography color="textSecondary">Manage subjects and teacher assignments</Typography>
              </div>
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />}
                onClick={() => setShowAssignTeacher(true)}
              >
                Assign Teacher
              </Button>
            </Box>
            
            {/* Add Subject Form */}
            <Box mb={4}>
              <Typography variant="h6" gutterBottom>Add New Subject</Typography>
              <Box display="flex" alignItems="center" gap={2}>
                <TextField
                  label="Subject Name"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  variant="outlined"
                  size="small"
                  fullWidth
                />
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={handleAddSubject}
                  disabled={!newSubjectName.trim()}
                >
                  Add Subject
                </Button>
              </Box>
            </Box>
            
            {/* Subjects List */}
            <Box mb={4}>
              <Typography variant="h6" gutterBottom>All Subjects</Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Created At</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subjects.map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell>{subject.id}</TableCell>
                        <TableCell>{subject.name}</TableCell>
                        <TableCell>{new Date(subject.createdAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <IconButton 
                            color="error" 
                            onClick={() => {
                              setSubjectToDelete(subject);
                              setShowDeleteSubjectConfirm(true);
                            }}
                            size="small"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            
            {/* Teacher Assignments */}
            <Box>
              <Typography variant="h6" gutterBottom>Teacher Assignments</Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Teacher</TableCell>
                      <TableCell>Class</TableCell>
                      <TableCell>Subject</TableCell>
                      <TableCell>Assigned On</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teacherAssignments.map((assignment) => {
                      const teacher = users.find(u => u.id === assignment.teacherId);
                      const classItem = classes.find(c => c.id === assignment.classId);
                      const subject = subjects.find(s => s.id === assignment.subjectId);
                      
                      return (
                        <TableRow key={`${assignment.teacherId}-${assignment.classId}-${assignment.subjectId}`}>
                          <TableCell>{teacher ? `${teacher.name} (${teacher.email})` : 'Unknown'}</TableCell>
                          <TableCell>{classItem ? classItem.name : 'Unknown'}</TableCell>
                          <TableCell>{subject ? subject.name : 'Unknown'}</TableCell>
                          <TableCell>{new Date(assignment.createdAt).toLocaleString()}</TableCell>
                          <TableCell>
                            <IconButton 
                              color="error" 
                              size="small"
                              onClick={() => handleRemoveAssignment(assignment.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
            
            {/* Assign Teacher Dialog */}
            <Dialog 
              open={showAssignTeacher} 
              onClose={() => setShowAssignTeacher(false)}
              maxWidth="sm"
              fullWidth
            >
              <DialogTitle>Assign Teacher to Subject</DialogTitle>
              <DialogContent>
                <Box mt={2} mb={2}>
                  <FormControl fullWidth variant="outlined" size="small" margin="normal">
                    <InputLabel>Teacher</InputLabel>
                    <Select
                      value={assignmentForm.teacherId}
                      onChange={(e) => setAssignmentForm({...assignmentForm, teacherId: e.target.value})}
                      label="Teacher"
                    >
                      {users
                        .filter(user => user.role === 'teacher')
                        .map(teacher => (
                          <MenuItem key={teacher.id} value={teacher.id}>
                            {teacher.name} ({teacher.email})
                          </MenuItem>
                        ))
                      }
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth variant="outlined" size="small" margin="normal">
                    <InputLabel>Class</InputLabel>
                    <Select
                      value={assignmentForm.classId}
                      onChange={(e) => setAssignmentForm({...assignmentForm, classId: e.target.value})}
                      label="Class"
                    >
                      {classes.map(classItem => (
                        <MenuItem key={classItem.id} value={classItem.id}>
                          {classItem.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  
                  <FormControl fullWidth variant="outlined" size="small" margin="normal">
                    <InputLabel>Subject</InputLabel>
                    <Select
                      value={assignmentForm.subjectId}
                      onChange={(e) => setAssignmentForm({...assignmentForm, subjectId: e.target.value})}
                      label="Subject"
                    >
                      {subjects.map(subject => (
                        <MenuItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowAssignTeacher(false)}>Cancel</Button>
                <Button 
                  onClick={handleAssignTeacher} 
                  variant="contained" 
                  color="primary"
                  disabled={!assignmentForm.teacherId || !assignmentForm.classId || !assignmentForm.subjectId}
                >
                  Assign
                </Button>
              </DialogActions>
            </Dialog>
            
            {/* Delete Confirmation Dialog */}
            <Dialog
              open={showDeleteSubjectConfirm}
              onClose={() => setShowDeleteSubjectConfirm(false)}
            >
              <DialogTitle>Confirm Delete</DialogTitle>
              <DialogContent>
                <Typography>
                  Are you sure you want to delete the subject "{subjectToDelete?.name}"? This action cannot be undone.
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setShowDeleteSubjectConfirm(false)}>Cancel</Button>
                <Button 
                  onClick={handleDeleteSubject} 
                  color="error" 
                  variant="contained"
                >
                  Delete
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        );
      case 3:
        return (
          <Grid container spacing={3}>
            {/* Exams List */}
            <Grid item xs={12} md={6}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Exams</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label="Search Exams"
                    size="small"
                    value={examSearch}
                    onChange={(e) => setExamSearch(e.target.value)}
                  />
                  <Button 
                    variant="outlined" 
                    size="small"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      api.get('/admin/exams')
                        .then(res => setExams(res.data))
                        .catch(console.error);
                    }}
                  >
                    Refresh
                  </Button>
                </Box>
              </Box>
              
              <TableContainer component={Paper} sx={{ maxHeight: '70vh', overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Title</TableCell>
                      <TableCell>Class</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredExams.length > 0 ? (
                      filteredExams.map((exam) => (
                        <TableRow 
                          key={exam.id}
                          hover
                          selected={selectedExam?.id === exam.id}
                          onClick={() => handleFetchExamQuestions(exam.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell>{exam.title}</TableCell>
                          <TableCell>{exam.Class?.name || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={exam.status || 'Draft'} 
                              size="small"
                              color={
                                exam.status === 'active' ? 'success' :
                                exam.status === 'completed' ? 'default' : 'secondary'
                              }
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="View Questions">
                              <IconButton size="small">
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit Exam">
                              <IconButton size="small">
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No exams found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            {/* Exam Questions Panel */}
            <Grid item xs={12} md={6}>
              {selectedExam ? (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">
                      Questions for {selectedExam.title}
                    </Typography>
                    <Button 
                      variant="outlined" 
                      size="small"
                      startIcon={<AddIcon />}
                    >
                      Add Question
                    </Button>
                  </Box>
                  
                  {examQuestions.length > 0 ? (
                    <Box sx={{ maxHeight: '60vh', overflow: 'auto' }}>
                      {examQuestions.map((question, index) => (
                        <Card key={question.id} sx={{ mb: 2, p: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="subtitle2">
                              Q{index + 1}. {question.text}
                            </Typography>
                            <Box>
                              <IconButton size="small">
                                <EditIcon fontSize="small" />
                              </IconButton>
                              <IconButton size="small" color="error">
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Box>
                          </Box>
                          <Box sx={{ mt: 1, pl: 2 }}>
                            {question.options?.map((option, i) => (
                              <Typography 
                                key={i} 
                                variant="body2"
                                sx={{
                                  color: i === question.answer ? 'success.main' : 'text.primary',
                                  fontWeight: i === question.answer ? 'bold' : 'normal'
                                }}
                              >
                                {String.fromCharCode(65 + i)}. {option}
                              </Typography>
                            ))}
                          </Box>
                        </Card>
                      ))}
                    </Box>
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      height: 200,
                      border: '1px dashed',
                      borderColor: 'divider',
                      borderRadius: 1
                    }}>
                      <Typography color="text.secondary">
                        No questions found for this exam
                      </Typography>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '100%',
                  border: '1px dashed',
                  borderColor: 'divider',
                  borderRadius: 1,
                  p: 3
                }}>
                  <Typography color="text.secondary" align="center">
                    Select an exam to view and manage questions
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        );
      case 4:
        return (
          <Box>
            <Typography variant="h5" component="h2" gutterBottom>
              Exam Analytics
            </Typography>
            <Typography color="text.secondary" paragraph>
              Select an exam to view detailed analytics and performance metrics.
            </Typography>
            
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                Performance Overview
              </Typography>
              <Box sx={{ height: 400, bgcolor: 'background.paper', p: 2, borderRadius: 1 }}>
                <Bar
                  data={{
                    labels: analytics.results.map(r => r.user || `Student ${r.userId}`),
                    datasets: [{
                      label: 'Scores',
                      data: analytics.results.map(r => r.score),
                      backgroundColor: 'rgba(25, 118, 210, 0.7)',
                      borderColor: 'rgba(25, 118, 210, 1)',
                      borderWidth: 1
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100
                      }
                    }
                  }}
                />
              </Box>
              
              <Grid container spacing={3} sx={{ mt: 2 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Highest Score
                      </Typography>
                      <Typography variant="h4">
                        {analytics.highest}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Average Score
                      </Typography>
                      <Typography variant="h4">
                        {analytics.avg.toFixed(1)}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Lowest Score
                      </Typography>
                      <Typography variant="h4">
                        {analytics.lowest}%
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </Box>
        );
      case 5:
        return (
          <Box>
            <Typography variant="h5" component="h2" gutterBottom>
              System Settings
            </Typography>
            
            <Card sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                Application Settings
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControlLabel
                  control={<Switch />}
                  label="Maintenance Mode"
                  sx={{ mb: 2 }}
                />
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Default User Role</InputLabel>
                  <Select
                    value="student"
                    label="Default User Role"
                    size="small"
                  >
                    <MenuItem value="student">Student</MenuItem>
                    <MenuItem value="teacher">Teacher</MenuItem>
                  </Select>
                </FormControl>
                
                <TextField
                  label="Session Timeout (minutes)"
                  type="number"
                  defaultValue={60}
                  size="small"
                  sx={{ mb: 2 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 3 }}>
                  <Button 
                    variant="outlined"
                    aria-label="Reset settings to default values"
                    title="Reset to Defaults"
                  >
                    Reset to Defaults
                  </Button>
                  <Button 
                    variant="contained"
                    aria-label="Save current settings"
                    title="Save Settings"
                  >
                    Save Settings
                  </Button>
                </Box>
              </Box>
            </Card>
          </Box>
        );
      default:
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Invalid tab selected
          </Typography>
        </Box>;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>Loading admin data...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, ...userSelect, p: 3 }}>
      {/* App Bar with Tabs */}
      <AppBar position="static" color="default" sx={{ mb: 3, borderRadius: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Tabs 
            value={tab} 
            onChange={handleTabChange}
            aria-label="admin navigation tabs"
            sx={{ flexGrow: 1 }}
          >
            {tabConfig.map((tab, index) => (
              <Tab key={index} label={tab.label} id={`admin-tab-${index}`} />
            ))}
          </Tabs>
          <Button color="inherit" onClick={logout} sx={{ mr: 2 }}>
            Logout
          </Button>
        </Box>
      </AppBar>

      {/* Tab Panels */}
      <Box sx={{ mt: 2 }}>
        {tabConfig.map((tabItem, index) => (
          <TabPanel key={tabItem.id} value={tab} index={index}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                <CircularProgress aria-label="Loading data" />
              </Box>
            ) : (
              renderTabContent()
            )}
          </TabPanel>
        ))}
      </Box>

      {/* Edit User Dialog */}
      <Dialog 
        open={!!editUser} 
        onClose={() => setEditUser(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editUser?.id ? 'Edit User' : 'Create New User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Full Name"
              value={editUser?.name || ''}
              onChange={(e) => setEditUser({...editUser, name: e.target.value})}
              fullWidth
              size="small"
              required
            />
            <TextField
              label="Email"
              type="email"
              value={editUser?.email || ''}
              onChange={(e) => setEditUser({...editUser, email: e.target.value})}
              fullWidth
              size="small"
            />
            <TextField
              label="Username"
              value={editUser?.username || ''}
              onChange={(e) => setEditUser({...editUser, username: e.target.value})}
              fullWidth
              size="small"
              disabled={!!editUser?.id}
            />
            {!editUser?.id && (
              <TextField
                label="Password"
                type="password"
                value={editUser?.password || ''}
                onChange={(e) => setEditUser({...editUser, password: e.target.value})}
                fullWidth
                size="small"
              />
            )}
            <FormControl fullWidth size="small">
              <InputLabel>Role</InputLabel>
              <Select
                value={editUser?.role || 'student'}
                label="Role"
                onChange={(e) => setEditUser({...editUser, role: e.target.value})}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="teacher">Teacher</MenuItem>
                <MenuItem value="student">Student</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>Class</InputLabel>
              <Select
                value={editUser?.classId || ''}
                label="Class"
                onChange={(e) => setEditUser({...editUser, classId: e.target.value})}
              >
                <MenuItem value="">None</MenuItem>
                {classes.map(cls => (
                  <MenuItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Telegram ID Field - Only shown for teachers */}
            {editUser?.role === 'teacher' && (
              <TextField
                label="Telegram ID"
                value={editUser?.telegramId || ''}
                onChange={(e) => setEditUser({...editUser, telegramId: e.target.value})}
                fullWidth
                size="small"
                required={editUser?.role === 'teacher'}
                helperText={editUser?.role === 'teacher' ? "Required for teacher notifications" : ""}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)}>Cancel</Button>
          <Button onClick={handleSaveUser} variant="contained">
            {editUser?.id ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deletingUser && setDeleteConfirmOpen(false)}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography id="delete-dialog-description">
            Are you sure you want to delete this user? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmOpen(false)} 
            disabled={deletingUser}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteUser} 
            color="error"
            variant="contained"
            disabled={deletingUser}
            startIcon={deletingUser ? <CircularProgress size={20} /> : null}
          >
            {deletingUser ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snack.open}
        autoHideDuration={snack.autoHideDuration || 6000}
        onClose={() => !snack.persist && setSnack(prev => ({...prev, open: false}))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        disableWindowBlurListener={snack.persist}
        ClickAwayListenerProps={{ mouseEvent: false }}
      >
        <Alert 
          onClose={() => setSnack(prev => ({...prev, open: false}))} 
          severity={snack.severity}
          sx={{ 
            width: '100%',
            '& .MuiAlert-message': {
              whiteSpace: 'pre-line',
              maxWidth: '400px',
              wordBreak: 'break-word'
            }
          }}
          action={
            snack.persist ? (
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => setSnack(prev => ({...prev, open: false}))}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            ) : null
          }
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default AdminPanel;
