import {createSlice, nanoid} from '@reduxjs/toolkit';

const initialState = {
  items: [],
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: {
      reducer(state, action) {
        // Add new notification at the top
        state.items.unshift(action.payload);
      },
      prepare({title, body, data}) {
        return {
          payload: {
            id: nanoid(),
            title: title || 'Notification',
            body: body || 'You have a new notification',
            data: data || {},
            read: false,
            receivedAt: new Date().toISOString(),
          },
        };
      },
    },
    markAllAsRead(state) {
      state.items.forEach(item => {
        item.read = true;
      });
    },
    clearNotifications(state) {
      state.items = [];
    },
    markNotificationRead(state, action) {
      const id = action.payload;
      const notification = state.items.find(item => item.id === id);
      if (notification) {
        notification.read = true;
      }
    },
    deleteNotification(state, action) {
      const id = action.payload;
      state.items = state.items.filter(item => item.id !== id);
    },
  },
});

export const {
  addNotification,
  markAllAsRead,
  clearNotifications,
  markNotificationRead,
  deleteNotification,
} = notificationsSlice.actions;

export default notificationsSlice.reducer;





