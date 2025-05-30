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
  Checkbox,
  Divider,
  Typography,
  Box,
} from '@mui/material';
import axios from 'axios';

const ShareMessageDialog = ({ open, userID, onClose, message, onShare }) => {
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null); // Lưu groupID hoặc userID được chọn
  const [loading, setLoading] = useState(false);

  // Lấy danh sách nhóm
  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://13.211.212.72:3000/api/group/${userID}`);
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách danh bạ
  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`http://13.211.212.72:3000/api/user/${userID}/contacts`);
      setContacts(response.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchGroups();
      fetchContacts();
    }
  }, [open, userID]);

  const handleSelectItem = (itemType, itemID) => {
    setSelectedItem({ type: itemType, id: itemID });
  };

  const handleShare = () => {
    if (selectedItem) {
      onShare(selectedItem.type, selectedItem.id, message);

      setSelectedItem(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Share Message</DialogTitle>
      <DialogContent>
        {loading ? (
          <Typography>Loading...</Typography>
        ) : (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Groups
            </Typography>
            <List>
              {groups.length === 0 ? (
                <Typography color="textSecondary">No groups available</Typography>
              ) : (
                groups.map(group => (
                  <ListItem
                    key={group.groupID}
                    button
                    onClick={() => handleSelectItem('group', group.groupID)}
                  >
                    <Checkbox
                      checked={selectedItem?.type === 'group' && selectedItem?.id === group.groupID}
                      onChange={() => handleSelectItem('group', group.groupID)}
                    />
                    <ListItemText primary={`Group: ${group.groupID}`} />
                  </ListItem>
                ))
              )}
            </List>
            <Divider />
            <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
              Contacts
            </Typography>
            <List>
              {contacts.length === 0 ? (
                <Typography color="textSecondary">No contacts available</Typography>
              ) : (
                contacts.map(contact => (
                  <ListItem
                    key={contact.userID}
                    button
                    onClick={() => handleSelectItem('contact', contact.userID)}
                  >
                    <Checkbox
                      checked={
                        selectedItem?.type === 'contact' && selectedItem?.id === contact.userID
                      }
                    />
                    <ListItemText primary={contact.username} secondary={contact.userID} />
                  </ListItem>
                ))
              )}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          Cancel
        </Button>
        <Button onClick={handleShare} color="primary" variant="contained" disabled={!selectedItem}>
          Share
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ShareMessageDialog;
