import React from 'react';
import { Container, Typography, Alert } from '@mui/material';

function Search() {
  return (
    <Container>
      <Typography variant="h4" gutterBottom>Search</Typography>
      <Alert severity="info">
        Configure Prowlarr or Jackett in Settings to search across indexers.
      </Alert>
    </Container>
  );
}

export default Search;
