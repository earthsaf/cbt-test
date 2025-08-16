import React from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, IconButton, Tooltip, Typography, Box, Button, TablePagination
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Visibility as ViewIcon } from '@mui/icons-material';

export default function QuestionList({ 
  questions, 
  loading, 
  onEdit, 
  onDelete, 
  onView,
  onDeleteAll,
  totalCount = 0,
  page = 0,
  rowsPerPage = 10,
  onPageChange = () => {},
  onRowsPerPageChange = () => {}
}) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <Box textAlign="center" p={3}>
        <Typography variant="body1" color="textSecondary">
          No questions found. Upload questions to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader aria-label="questions table">
          <TableHead>
            <TableRow>
              <TableCell>Question</TableCell>
              <TableCell align="right">Type</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {questions.map((question) => (
              <TableRow key={question.id} hover>
                <TableCell component="th" scope="row">
                  <Typography variant="body2" noWrap sx={{ maxWidth: 500 }}>
                    {question.text || 'No question text'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Chip 
                    label={question.type || 'MCQ'} 
                    size="small" 
                    color={question.type === 'essay' ? 'primary' : 'default'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View">
                    <IconButton size="small" onClick={() => onView(question)}>
                      <ViewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => onEdit(question)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => onDelete(question.id)} color="error">
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box display="flex" justifyContent="space-between" alignItems="center" p={2}>
        <Button 
          color="error" 
          variant="outlined" 
          size="small"
          onClick={onDeleteAll}
          disabled={questions.length === 0}
        >
          Delete All Questions
        </Button>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={onPageChange}
          onRowsPerPageChange={onRowsPerPageChange}
        />
      </Box>
    </Paper>
  );
}
