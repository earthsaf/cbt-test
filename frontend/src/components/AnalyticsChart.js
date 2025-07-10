import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Grid, 
  Paper, 
  Chip 
} from '@mui/material';
import { 
  Bar, 
  Line 
} from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  PointElement, 
  LineElement, 
  Legend, 
  Title, 
  Tooltip 
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Legend,
  Title,
  Tooltip
);

const AnalyticsChart = ({ 
  analytics, 
  loading = false 
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <Typography>Loading analytics...</Typography>
      </Box>
    );
  }

  if (!analytics) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          No analytics available
        </Typography>
      </Box>
    );
  }

  const scoreData = {
    labels: analytics.results.map(r => r.studentName),
    datasets: [
      {
        label: 'Scores',
        data: analytics.results.map(r => r.score),
        backgroundColor: 'rgba(25, 118, 210, 0.5)',
        borderColor: '#1976d2',
        borderWidth: 1
      }
    ]
  };

  const timeData = {
    labels: analytics.results.map(r => r.studentName),
    datasets: [
      {
        label: 'Time Taken (minutes)',
        data: analytics.results.map(r => r.timeTaken),
        borderColor: '#4caf50',
        tension: 0.1,
        fill: false
      }
    ]
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Exam Performance Overview
            </Typography>
            <Box sx={{ height: 400 }}>
              <Bar data={scoreData} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Time Analysis
            </Typography>
            <Box sx={{ height: 400 }}>
              <Line data={timeData} />
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Key Statistics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {analytics.highestScore}
                  </Typography>
                  <Typography variant="body2">
                    Highest Score
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="error">
                    {analytics.lowestScore}
                  </Typography>
                  <Typography variant="body2">
                    Lowest Score
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={4}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success">
                    {analytics.averageScore}
                  </Typography>
                  <Typography variant="body2">
                    Average Score
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
              Most Challenging Questions
            </Typography>
            {analytics.mostDifficultQuestions.map((q, index) => (
              <Chip
                key={index}
                label={`${q.text} (Failed ${q.failCount} times)`}
                color="warning"
                sx={{ mr: 1, mb: 1 }}
              />
            ))}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default AnalyticsChart;
