import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  TextField, 
  Button, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Alert
} from '@mui/material';
import { Add, Save, Close } from '@mui/icons-material';

const QuestionForm = ({ onSubmit, onCancel, question = null, difficultyOptions = ['Easy', 'Medium', 'Hard'] }) => {
  const [formData, setFormData] = useState({
    text: question?.text || '',
    options: {
      a: question?.options?.a || '',
      b: question?.options?.b || '',
      c: question?.options?.c || '',
      d: question?.options?.d || ''
    },
    answer: question?.answer || '',
    difficulty: question?.difficulty || 'Medium',
    marks: question?.marks || 1,
    explanation: question?.explanation || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleOptionChange = (option, value) => {
    setFormData(prev => ({
      ...prev,
      options: {
        ...prev.options,
        [option]: value
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card sx={{ p: 3, mb: 3 }}>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Typography variant="h6" gutterBottom>
            {question ? 'Edit Question' : 'Add New Question'}
          </Typography>

          <TextField
            fullWidth
            label="Question Text"
            name="text"
            value={formData.text}
            onChange={handleChange}
            margin="normal"
            required
            multiline
            rows={3}
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            {['a', 'b', 'c', 'd'].map((opt) => (
              <TextField
                key={opt}
                label={opt.toUpperCase()}
                name={`option_${opt}`}
                value={formData.options[opt]}
                onChange={(e) => handleOptionChange(opt, e.target.value)}
                margin="normal"
                required
              />
            ))}
          </Box>

          <TextField
            select
            label="Difficulty Level"
            name="difficulty"
            value={formData.difficulty}
            onChange={handleChange}
            margin="normal"
            required
          >
            {difficultyOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            type="number"
            label="Marks"
            name="marks"
            value={formData.marks}
            onChange={handleChange}
            margin="normal"
            required
            inputProps={{ min: 1 }}
          />

          <TextField
            fullWidth
            label="Explanation"
            name="explanation"
            value={formData.explanation}
            onChange={handleChange}
            margin="normal"
            multiline
            rows={4}
          />

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<FaSave />}
              type="submit"
            >
              {question ? 'Update' : 'Add Question'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<FaTimes />}
              onClick={onCancel}
            >
              Cancel
            </Button>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
};

export default QuestionForm;
