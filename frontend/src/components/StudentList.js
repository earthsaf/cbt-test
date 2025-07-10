import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper, 
  IconButton, 
  Tooltip, 
  Chip, 
  Typography, 
  Box 
} from '@mui/material';
import { 
  FaUser, 
  FaEnvelope, 
  FaGraduationCap, 
  FaEdit, 
  FaEye, 
  FaTimes 
} from 'react-icons/fa';

const StudentList = ({ 
  students, 
  onEdit, 
  onViewPerformance,
  onDelete,
  loading = false 
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Typography>Loading students...</Typography>
      </Box>
    );
  }

  if (!students || students.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No students available
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Class</TableCell>
            <TableCell>Performance</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.id}>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FaUser />
                  <Typography variant="body2">
                    {student.name}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FaEnvelope />
                  <Typography variant="body2" noWrap>
                    {student.email}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={student.class}
                  color="primary"
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FaGraduationCap />
                  <Typography variant="body2">
                    {student.performance || 'N/A'}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  size="small"
                  label={student.status || 'Active'}
                  color={student.status === 'Active' ? 'success' : 'error'}
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="View Performance">
                    <IconButton onClick={() => onViewPerformance(student.id)}>
                      <FaEye />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => onEdit(student.id)}>
                      <FaEdit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => onDelete(student.id)} color="error">
                      <FaTimes />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default StudentList;
