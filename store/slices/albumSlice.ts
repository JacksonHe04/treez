import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Album {
  id: string;
  name: string;
  artist: string;
  releaseDate: string;
}

interface AlbumState {
  albums: Album[];
  loading: boolean;
  error: string | null;
}

const initialState: AlbumState = {
  albums: [],
  loading: false,
  error: null,
};

export const albumSlice = createSlice({
  name: 'album',
  initialState,
  reducers: {
    setAlbums: (state, action: PayloadAction<Album[]>) => {
      state.albums = action.payload;
    },
    addAlbum: (state, action: PayloadAction<Album>) => {
      state.albums.push(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const { setAlbums, addAlbum, setLoading, setError } = albumSlice.actions;
export default albumSlice.reducer;
