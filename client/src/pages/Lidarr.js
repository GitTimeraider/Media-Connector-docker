import React from 'react';
import { Container, Typography, Alert } from '@mui/material';

function Lidarr() {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>Music</Typography>
      <Alert severity="info">
        Configure Lidarr in Settings to manage your music library.
      </Alert>
    </Container>
  );
}

export default Lidarr;
