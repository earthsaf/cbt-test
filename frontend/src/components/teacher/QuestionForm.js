import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Grid,
  IconButton,
  Typography,
  Divider,
  Paper,
  useTheme
} from '@mui/material';
import { Add, Delete, Close } from '@mui/icons-material';

const QuestionForm = ({
  open,
  onClose,
  onSubmit,
  question: initialQuestion,
  loading = false,
  error = null,
  assignmentOptions = []
}) => {
  const theme = useTheme();
  const [question, setQuestion] = useState({
    text: '',
    options: ['', '', '', ''],
    answer: '',
    points: 1,
    type: 'multiple_choice',
    assignmentId: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialQuestion) {
      setQuestion({
        text: initialQuestion.text || '',
        options: Array.isArray(initialQuestion.options) 
          ? [...initialQuestion.options, '', ''].slice(0, 4) 
          : ['', '', '', ''],
        answer: initialQuestion.answer || '',
        points: initialQuestion.points || 1,
        type: initialQuestion.type || 'multiple_choice',
        assignmentId: initialQuestion.assignmentId || (assignmentOptions[0]?.id || '')
      });
    } else if (open) {
      // Reset form when opening for new question
      setQuestion({
        text: '',
        options: ['', '', '', ''],
        answer: '',
        points: 1,
        type: 'multiple_choice',
        assignmentId: assignmentOptions[0]?.id || ''
      });
      setErrors({});
    }
  }, [initialQuestion, open, assignmentOptions]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setQuestion(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when field is edited
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...question.options];
    newOptions[index] = value;
    setQuestion(prev => ({
      ...prev,
      options: newOptions
    }));
  };

  const addOption = () => {
    if (question.options.length < 6) {
      setQuestion(prev => ({
        ...prev,
        options: [...prev.options, '']
      }));
    }
  };

  const removeOption = (index) => {
    if (question.options.length > 2) {
      const newOptions = question.options.filter((_, i) => i !== index);
      setQuestion(prev => ({
        ...prev,
        options: newOptions,
        answer: prev.answer === String.fromCharCode(65 + index) ? '' : 
                prev.answer > String.fromCharCode(65 + index) ? 
                String.fromCharCode(prev.answer.charCodeAt(0) - 1) : prev.answer
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    
    if (!question.text.trim()) {
      newErrors.text = 'Question text is required';
    }
    
    if (question.type === 'multiple_choice') {
      const filledOptions = question.options.filter(opt => opt.trim() !== '');
      
      if (filledOptions.length < 2) {
        newErrors.options = 'At least 2 options are required';
      }
      
      if (!question.answer) {
        newErrors.answer = 'Please select the correct answer';
      } else if (!question.options[question.answer.charCodeAt(0) - 65]?.trim()) {
        newErrors.answer = 'Selected answer must have text';
      }
    } else if (question.type === 'true_false') {
      if (!['A', 'B'].includes(question.answer)) {
        newErrors.answer = 'Please select True or False';
      }
    }
    
    if (!question.assignmentId) {
      newErrors.assignmentId = 'Please select an assignment';
    }
    
    if (question.points <= 0) {
      newErrors.points = 'Points must be greater than 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // Clean up empty options before submitting
      const cleanedQuestion = {
        ...question,
        options: question.options.filter(opt => opt.trim() !== '')
      };
      onSubmit(cleanedQuestion);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {initialQuestion ? 'Edit Question' : 'Add New Question'}
          <IconButton
            aria-label="close"
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers>
          {error && (
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                mb: 2, 
                backgroundColor: theme.palette.error.background,
                borderLeft: `4px solid ${theme.palette.error.main}`
              }}
            >
              <Typography color="error">{error}</Typography>
            </Paper>
          )}
          
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="assignment-label">Assignment</InputLabel>
                <Select
                  labelId="assignment-label"
                  name="assignmentId"
                  value={question.assignmentId}
                  onChange={handleChange}
                  label="Assignment"
                  error={!!errors.assignmentId}
                >
                  {assignmentOptions.map(assignment => (
                    <MenuItem key={assignment.id} value={assignment.id}>
                      {assignment.title}
                    </MenuItem>
                  ))}
                </Select>
                {errors.assignmentId && (
                  <FormHelperText error>{errors.assignmentId}</FormHelperText>
                )}
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="question-type-label">Question Type</InputLabel>
                <Select
                  labelId="question-type-label"
                  name="type"
                  value={question.type}
                  onChange={handleChange}
                  label="Question Type"
                >
                  <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                  <MenuItem value="true_false">True/False</MenuItem>
                  <MenuItem value="short_answer">Short Answer</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                margin="normal"
                name="points"
                label="Points"
                type="number"
                value={question.points}
                onChange={handleChange}
                error={!!errors.points}
                helperText={errors.points}
                inputProps={{ min: 1, step: 0.5 }}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                margin="normal"
                name="text"
                label="Question Text"
                value={question.text}
                onChange={handleChange}
                error={!!errors.text}
                helperText={errors.text}
                required
              />
            </Grid>
            
            {(question.type === 'multiple_choice' || question.type === 'true_false') && (
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Options {errors.options && (
                    <Typography component="span" color="error" variant="caption">
                      {errors.options}
                    </Typography>
                  )}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  {(question.type === 'true_false' ? ['True', 'False'] : question.options).map((option, index) => (
                    <Box key={index} display="flex" alignItems="center" mb={1}>
                      <Box
                        onClick={() => setQuestion(prev => ({
                          ...prev,
                          answer: String.fromCharCode(65 + index)
                        }))}
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          border: `2px solid ${
                            question.answer === String.fromCharCode(65 + index)
                              ? theme.palette.primary.main
                              : theme.palette.grey[400]
                          }`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1,
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                      >
                        {question.answer === String.fromCharCode(65 + index) && (
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: theme.palette.primary.main
                            }}
                          />
                        )}
                      </Box>
                      
                      <Typography variant="body1" sx={{ mr: 1, minWidth: '24px' }}>
                        {String.fromCharCode(65 + index)}.
                      </Typography>
                      
                      {question.type === 'multiple_choice' ? (
                        <>
                          <TextField
                            fullWidth
                            size="small"
                            value={option}
                            onChange={(e) => handleOptionChange(index, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                            error={!option.trim() && index < 2}
                          />
                          {question.options.length > 2 && (
                            <IconButton 
                              size="small" 
                              onClick={() => removeOption(index)}
                              sx={{ ml: 1 }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </>
                      ) : (
                        <Typography variant="body1" sx={{ flexGrow: 1 }}>
                          {option}
                        </Typography>
                      )}
                    </Box>
                  ))}
                  
                  {question.type === 'multiple_choice' && question.options.length < 6 && (
                    <Button
                      startIcon={<Add />}
                      onClick={addOption}
                      size="small"
                      sx={{ mt: 1 }}
                    >
                      Add Option
                    </Button>
                  )}
                  
                  {errors.answer && (
                    <Typography variant="caption" color="error">
                      {errors.answer}
                    </Typography>
                  )}
                </Box>
              </Grid>
            )}
            
            {question.type === 'short_answer' && (
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  margin="normal"
                  name="answer"
                  label="Expected Answer"
                  value={question.answer}
                  onChange={handleChange}
                  error={!!errors.answer}
                  helperText={errors.answer || 'The expected answer for short answer questions'}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Question'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default QuestionForm;
