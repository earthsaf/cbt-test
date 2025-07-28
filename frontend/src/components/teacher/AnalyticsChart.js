import React from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel,
  Grid,
  CircularProgress,
  useTheme
} from '@mui/material';
import {
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

export default function AnalyticsChart({ data, loading, onExamSelect, selectedExam }) {
  const theme = useTheme();
  
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Box p={4} textAlign="center">
        <Typography variant="h6" color="textSecondary">
          No analytics data available. Create and grade some exams to see analytics.
        </Typography>
      </Box>
    );
  }

  // Process data for charts
  const processScores = (scores) => {
    if (!scores || scores.length === 0) return [];
    
    const scoreRanges = [
      { range: '0-20', min: 0, max: 20, count: 0 },
      { range: '21-40', min: 21, max: 40, count: 0 },
      { range: '41-60', min: 41, max: 60, count: 0 },
      { range: '61-80', min: 61, max: 80, count: 0 },
      { range: '81-100', min: 81, max: 100, count: 0 },
    ];

    scores.forEach(score => {
      const range = scoreRanges.find(r => 
        score >= r.min && score <= r.max
      );
      if (range) range.count++;
    });

    return scoreRanges;
  };

  const scoreData = processScores(data.scores || []);
  const examData = data.examPerformance || [];

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Score Distribution
            </Typography>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="count" 
                    name="Number of Students"
                    fill={theme.palette.primary.main} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Exam Performance</Typography>
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Select Exam</InputLabel>
                <Select
                  value={selectedExam || ''}
                  onChange={(e) => onExamSelect(e.target.value)}
                  label="Select Exam"
                >
                  {data.exams?.map((exam) => (
                    <MenuItem key={exam.id} value={exam.id}>
                      {exam.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box height={300}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={examData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    name="Average Score" 
                    stroke={theme.palette.secondary.main} 
                    activeDot={{ r: 8 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Performance Summary
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={3}>
              <StatBox 
                title="Average Score" 
                value={`${data.averageScore?.toFixed(1) || 'N/A'}%`} 
                color={theme.palette.primary.main}
              />
              <StatBox 
                title="Total Students" 
                value={data.totalStudents || 0} 
                color={theme.palette.secondary.main}
              />
              <StatBox 
                title="Pass Rate" 
                value={`${data.passRate?.toFixed(1) || 'N/A'}%`} 
                color={theme.palette.success.main}
              />
              <StatBox 
                title="Exams Graded" 
                value={data.examsGraded || 0} 
                color={theme.palette.info.main}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function StatBox({ title, value, color }) {
  return (
    <Box flex={1} minWidth={150} textAlign="center" p={2}>
      <Typography variant="subtitle2" color="textSecondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h4" style={{ color }}>
        {value}
      </Typography>
    </Box>
  );
}
