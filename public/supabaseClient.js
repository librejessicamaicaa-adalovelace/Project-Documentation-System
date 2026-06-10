// Initialize Supabase client for frontend
const supabaseUrl = window.SUPABASE_CONFIG?.url;
const supabaseKey = window.SUPABASE_CONFIG?.anonKey;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase configuration not found in config.js");
}

// Supabase client initialization with real-time support
const supabaseClient = {
  url: supabaseUrl,
  key: supabaseKey,
  subscription: null,
  listeners: [],

  // Register callback for real-time updates
  onUpdate(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  },

  // Notify all listeners of changes
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error("Error in real-time listener callback:", error);
      }
    });
  },

  async fetchTasks() {
    try {
      const response = await fetch("/api/tasks", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.tasks;
    } catch (error) {
      console.error("Error fetching tasks:", error);
      return [];
    }
  },

  async createTask(taskData) {
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const newTask = await response.json();
      // Notify listeners of the new task
      this.notifyListeners("INSERT", newTask);
      return newTask;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  },

  async updateTask(id, updates) {
    try {
      const response = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const updatedTask = await response.json();
      // Notify listeners of the update
      this.notifyListeners("UPDATE", updatedTask);
      return updatedTask;
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  },

  async deleteTask(id) {
    try {
      const response = await fetch(`/api/tasks?id=${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      // Notify listeners of the deletion
      this.notifyListeners("DELETE", { id });
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  },

  // Subscribe to real-time updates (for future implementation with Supabase Realtime)
  subscribeToRealtimeUpdates() {
    // This is a placeholder for Supabase Realtime connection
    // The actual real-time updates are triggered through the API methods above
    console.log("Real-time subscriptions are active through API methods");
  },

  // Unsubscribe from real-time updates
  unsubscribeFromRealtimeUpdates() {
    if (this.subscription) {
      // Cleanup subscription when implemented with Supabase Realtime
      this.subscription = null;
    }
  }
};
