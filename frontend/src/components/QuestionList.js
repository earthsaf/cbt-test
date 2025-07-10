import React from 'react';
import { 
  Box, 
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
  Typography 
} from '@mui/material';
import { 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaCheckCircle, 
  FaTimesCircle 
} from 'react-icons/fa';

const QuestionList = ({ 
  questions, 
  onEdit, 
  onDelete, 
  onView,
  loading = false 
}) => {
  const renderQuestionText = (text) => {
    if (!text) return 'No question text';
    const words = text.split(' ');
    if (words.length > 10) {
      return `${words.slice(0, 10).join(' ')}...`;
    }
    return text;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Typography>Loading questions...</Typography>
      </Box>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No questions available
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Question</TableCell>
            <TableCell align="center">Difficulty</TableCell>
            <TableCell align="center">Marks</TableCell>
            <TableCell align="center">Status</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {questions.map((question) => (
            <TableRow key={question.id}>
              <TableCell>
                <Typography variant="body2" noWrap>
                  {renderQuestionText(question.text)}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Chip
                  size="small"
                  label={question.difficulty}
                  color={question.difficulty === 'Easy' ? 'success' : 
                         question.difficulty === 'Medium' ? 'warning' : 'error'}
                />
              </TableCell>
              <TableCell align="center">
                {question.marks}
              </TableCell>
              <TableCell align="center">
                <Tooltip title={question.status === 'active' ? 'Active' : 'Inactive'}>
                  <span>
                    {question.status === 'active' ? (
                      <FaCheckCircle color="green" />
                    ) : (
                      <FaTimesCircle color="red" />
                    )}
                  </span>
                </Tooltip>
              </TableCell>
              <TableCell align="center">
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="View">
                    <IconButton onClick={() => onView(question)}>
                      <FaEye />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => onEdit(question)}>
                      <FaEdit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => onDelete(question.id)} color="error">
                      <FaTrash />
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

export default QuestionList;
