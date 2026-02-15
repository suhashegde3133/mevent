import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { API_BASE_URL } from "../../utils/constants";
import session from "../../utils/session";

const initialProfile = {
  fullName: "",
  email: "",
  phone: "",
  designation: "",
  avatar: null,
  avatarPreview: null,
};
const initialCompany = {
  name: "",
  email: "",
  phone: "",
  address: "",
  logo: null,
  logoPreview: null,
};
const initialBank = {
  bankName: "",
  accountHolder: "",
  accountNumber: "",
  branch: "",
  ifsc: "",
  address: "",
  upiId: "",
  upiQr: null,
  upiQrPreview: null,
};
const initialNotifications = {
  overall: true,
  events: true,
  chat: true,
};

const initialState = {
  profile: initialProfile,
  company: initialCompany,
  bank: initialBank,
  notifications: initialNotifications,
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    updateProfile: (state, action) => {
      state.profile = { ...state.profile, ...action.payload };
    },
    updateCompany: (state, action) => {
      state.company = { ...state.company, ...action.payload };
    },
    updateBank: (state, action) => {
      state.bank = { ...state.bank, ...action.payload };
    },
    updateNotifications: (state, action) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    setSettings: (state, action) => {
      state.profile = { ...state.profile, ...action.payload.profile };
      state.company = { ...state.company, ...action.payload.company };
      state.bank = { ...state.bank, ...action.payload.bank };
      state.notifications = {
        ...state.notifications,
        ...action.payload.notifications,
      };
    },
    clearSettings: (state) => {
      state.profile = initialState.profile;
      state.company = initialState.company;
      state.bank = initialState.bank;
      state.notifications = initialState.notifications;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveProfile.fulfilled, (state, action) => {
        state.profile = { ...state.profile, ...action.payload };
      })
      .addCase(saveProfile.rejected, (state, action) => {
        console.error("Failed to save profile:", action.payload);
      })
      .addCase(saveCompany.fulfilled, (state, action) => {
        state.company = { ...state.company, ...action.payload };
      })
      .addCase(saveCompany.rejected, (state, action) => {
        console.error("Failed to save company:", action.payload);
      })
      .addCase(saveBank.fulfilled, (state, action) => {
        state.bank = { ...state.bank, ...action.payload };
      })
      .addCase(saveBank.rejected, (state, action) => {
        console.error("Failed to save bank:", action.payload);
      })
      .addCase(saveNotifications.fulfilled, (state, action) => {
        state.notifications = { ...state.notifications, ...action.payload };
      })
      .addCase(saveNotifications.rejected, (state, action) => {
        console.error("Failed to save notifications:", action.payload);
      })
      .addCase(loadSettings.fulfilled, (state, action) => {
        if (action.payload) {
          // Extract nested objects from response and merge with existing state
          const payload = action.payload;
          const profile = payload.profile || {};
          const company = payload.company || {};
          const bank = payload.bank || {};
          const notifications = payload.notifications || {};

          state.profile = { ...state.profile, ...profile };
          state.company = { ...state.company, ...company };
          state.bank = { ...state.bank, ...bank };
          state.notifications = { ...state.notifications, ...notifications };
        }
      })
      .addCase(loadSettings.rejected, (state, action) => {
        console.error("Failed to load settings:", action.payload);
      });
  },
});

export const {
  updateProfile,
  updateCompany,
  updateBank,
  updateNotifications,
  setSettings,
  clearSettings,
} = settingsSlice.actions;

// Async thunks to persist settings to backend API. These are safe to call
// after updating local Redux state (optimistic) or standalone; on success
// we re-sync state with server response.
export const saveProfile = createAsyncThunk(
  "settings/saveProfile",
  async (profile, { rejectWithValue }) => {
    try {
      const token = session.getToken();
      const url = `${API_BASE_URL}/settings/profile`;
      const res = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(profile || {}),
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      const errorText = await res.text();
      console.error("saveProfile failed", errorText);
      return rejectWithValue(errorText);
    } catch (e) {
      console.error("saveProfile error", e);
      return rejectWithValue(e.message);
    }
  },
);

export const saveCompany = createAsyncThunk(
  "settings/saveCompany",
  async (company, { rejectWithValue }) => {
    try {
      const token = session.getToken();
      const res = await fetch(`${API_BASE_URL}/settings/company`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(company || {}),
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      const errorText = await res.text();
      console.error("saveCompany failed", errorText);
      return rejectWithValue(errorText);
    } catch (e) {
      console.error("saveCompany error", e);
      return rejectWithValue(e.message);
    }
  },
);

export const saveBank = createAsyncThunk(
  "settings/saveBank",
  async (bank, { rejectWithValue }) => {
    try {
      const token = session.getToken();
      const res = await fetch(`${API_BASE_URL}/settings/bank`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(bank || {}),
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      const errorText = await res.text();
      console.error("saveBank failed", errorText);
      return rejectWithValue(errorText);
    } catch (e) {
      console.error("saveBank error", e);
      return rejectWithValue(e.message);
    }
  },
);

export const saveNotifications = createAsyncThunk(
  "settings/saveNotifications",
  async (notifications, { rejectWithValue }) => {
    try {
      const token = session.getToken();
      const res = await fetch(`${API_BASE_URL}/settings/notifications`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(notifications || {}),
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      // eslint-disable-next-line no-console
      const errorText = await res.text();
      console.error("saveNotifications failed", errorText);
      return rejectWithValue(errorText);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("saveNotifications error", e);
      return rejectWithValue(e.message);
    }
  },
);

export const loadSettings = createAsyncThunk(
  "settings/loadSettings",
  async (_, { rejectWithValue }) => {
    try {
      const token = session.getToken();

      // Fetch both settings and user data in parallel
      const [settingsRes, userRes] = await Promise.all([
        fetch(`${API_BASE_URL}/settings`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }),
        fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }),
      ]);

      if (settingsRes.ok && userRes.ok) {
        const settingsData = await settingsRes.json();
        const userData = await userRes.json();

        // Merge user data (plan, planActivatedAt, etc.) into profile
        return {
          ...settingsData,
          profile: {
            ...settingsData.profile,
            plan: userData.plan,
            planActivatedAt: userData.planActivatedAt,
            createdAt: userData.createdAt,
          },
        };
      } else if (settingsRes.ok) {
        // Fallback to just settings if user fetch fails
        const data = await settingsRes.json();
        return data;
      }

      const errorText = await settingsRes.text();
      console.error("loadSettings failed", errorText);
      return rejectWithValue(errorText);
    } catch (e) {
      console.error("loadSettings error", e);
      return rejectWithValue(e.message);
    }
  },
);

export default settingsSlice.reducer;
