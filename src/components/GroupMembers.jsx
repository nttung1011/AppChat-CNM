import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';

const GroupMembersModal = ({ open, onClose, groupID }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Lấy danh sách thành viên nhóm
  const fetchGroupMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`http://localhost:3000/api/group/${groupID}/users`);
      setMembers(response.data.data);
    } catch (err) {
      setError('Failed to fetch group members');
      console.error('Error fetching group members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && groupID) {
      fetchGroupMembers();
    }
  }, [open, groupID]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      sx={{ '& .MuiDialog-paper': { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 500, color: 'text.primary' }}>Group Members</DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', padding: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ padding: 2 }}>
            {error}
          </Typography>
        ) : members.length === 0 ? (
          <Typography color="text.secondary" sx={{ padding: 2 }}>
            No members found
          </Typography>
        ) : (
          <List sx={{ padding: 0 }}>
            {members.map(member => (
              <ListItem
                key={member.userID}
                sx={{
                  padding: '8px 16px',
                  '&:hover': { backgroundColor: 'grey.100' },
                }}
              >
                <ListItemText
                  primary={member.userID}
                  secondary={member.memberRole}
                  primaryTypographyProps={{
                    fontWeight: member.memberRole === 'LEADER' ? 600 : 400,
                  }}
                  secondaryTypographyProps={{ color: 'text.secondary' }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" sx={{ textTransform: 'none' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GroupMembersModal;
