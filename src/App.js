import React, { useState, useEffect, useRef } from 'react';

// Main App component
export default function App() {
  // State variables for managing the application
  const [media, setMedia] = useState([]); // Stores the fetched media data (photos or videos)
  const [searchTerm, setSearchTerm] = useState('nature'); // What the user is currently typing in the input field
  const [currentSearchQuery, setCurrentSearchQuery] = useState('nature'); // The query that actually triggers the API fetch
  const [loading, setLoading] = useState(true); // Loading state for API calls
  const [error, setError] = useState(null); // Error message if API call fails
  const [currentPage, setCurrentPage] = useState(1); // Current page for pagination
  const [totalPages, setTotalPages] = useState(1); // Total pages available from API
  const [perPage, setPerPage] = useState(20); // Number of media items per page (can be adjusted)
  const [mediaType, setMediaType] = useState('photo'); // 'photo' or 'video'
  const [apiSource, setApiSource] = useState('pixabay'); // 'pixabay' or 'pexels'

  // Ref to the hidden canvas element for photo text overlay
  const canvasRef = useRef(null);

  // API Keys and URLs
  // Pixabay: https://pixabay.com/api/docs/
  const PIXABAY_API_KEY = '49507277-8909a8996bad61e590d8d5a88';
  const PIXABAY_PHOTO_API_URL = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}`;
  // FIX: Changed PIXABAY_API_URL to PIXABAY_API_KEY in the video URL construction
  const PIXABAY_VIDEO_API_URL = `https://pixabay.com/api/videos/?key=${PIXABAY_API_KEY}`;

  // Pexels: https://www.pexels.com/api/
  const PEXELS_API_KEY = 'm0FwSIAAIBi8zyCgOIMFZK9DrOPbPeQlEM0icQjj230jsVShoxjsOABW';
  const PEXELS_PHOTO_API_URL = `https://api.pexels.com/v1/search`;
  const PEXELS_VIDEO_API_URL = `https://api.pexels.com/videos/search`;

  /**
   * Normalizes data from Pixabay API response to a common format.
   * @param {Object} item - A single item from Pixabay's 'hits' array.
   * @param {string} type - 'photo' or 'video'.
   * @returns {Object} Normalized media item.
   */
  const normalizePixabayItem = (item, type) => {
    if (type === 'photo') {
      return {
        id: `pb-${item.id}`, // Prefix ID to avoid conflicts if IDs overlap between APIs
        tags: item.tags,
        user: item.user,
        previewURL: item.webformatURL,
        largeURL: item.largeImageURL,
        type: 'photo',
        source: 'Pixabay'
      };
    } else { // video
      return {
        id: `pb-${item.id}`,
        tags: item.tags,
        user: item.user,
        previewURL: item.videos?.small?.url || item.videos?.tiny?.url,
        largeURL: item.videos?.large?.url || item.videos?.medium?.url,
        posterURL: item.videos?.picture_id ? `https://i.vimeocdn.com/video/${item.videos.picture_id}_640x360.jpg` : `https://placehold.co/600x400/374151/D1D5DB?text=No+Preview`,
        type: 'video',
        source: 'Pixabay'
      };
    }
  };

  /**
   * Normalizes data from Pexels API response to a common format.
   * @param {Object} item - A single item from Pexels 'photos' or 'videos' array.
   * @param {string} type - 'photo' or 'video'.
   * @returns {Object} Normalized media item.
   */
  const normalizePexelsItem = (item, type) => {
    if (type === 'photo') {
      return {
        id: `px-${item.id}`,
        tags: item.alt || '', // Pexels photos use 'alt' as descriptive tags
        user: item.photographer,
        previewURL: item.src?.medium,
        largeURL: item.src?.original,
        type: 'photo',
        source: 'Pexels'
      };
    } else { // video
      // Find the best quality video URL for large and a smaller one for preview
      const largeVideo = item.video_files?.find(f => f.quality === 'hd' || f.quality === 'sd');
      const previewVideo = item.video_files?.find(f => f.quality === 'sd' || f.quality === 'hd' || f.quality === 'medium');

      return {
        id: `px-${item.id}`,
        tags: item.image?.alt || '', // Pexels videos also have an 'image' for thumbnail with 'alt'
        user: item.photographer,
        previewURL: previewVideo?.link, // Use a smaller quality video for preview
        largeURL: largeVideo?.link, // Use a higher quality video for download
        posterURL: item.image, // Pexels video poster is the 'image' property
        type: 'video',
        source: 'Pexels'
      };
    }
  };

  /**
   * Fetches media from the chosen API based on the current query, media type, and page.
   */
  const fetchMedia = async () => {
    setLoading(true);
    setError(null);
    setMedia([]);

    try {
      let response;
      const apiQuery = encodeURIComponent(currentSearchQuery);

      if (apiSource === 'pixabay') {
        if (mediaType === 'photo') {
          response = await fetch(
            `${PIXABAY_PHOTO_API_URL}&q=${apiQuery}&image_type=photo&orientation=vertical&safesearch=true&page=${currentPage}&per_page=${perPage}`
          );
        } else { // video
          response = await fetch(
            `${PIXABAY_VIDEO_API_URL}&q=${apiQuery}&video_type=all&safesearch=true&page=${currentPage}&per_page=${perPage}`
          );
        }
      } else { // apiSource === 'pexels'
        if (PEXELS_API_KEY === 'YOUR_PEXELS_API_KEY') { // Check Pexels placeholder
          setError('Please replace "YOUR_PEXELS_API_KEY" with your actual Pexels API key.');
          setLoading(false);
          return;
        }
        const headers = { 'Authorization': PEXELS_API_KEY };
        if (mediaType === 'photo') {
          response = await fetch(
            `${PEXELS_PHOTO_API_URL}?query=${apiQuery}&per_page=${perPage}&page=${currentPage}&orientation=portrait`, // Pexels has 'orientation' for photos
            { headers }
          );
        } else { // video
          response = await fetch(
            `${PEXELS_VIDEO_API_URL}?query=${apiQuery}&per_page=${perPage}&page=${currentPage}`,
            { headers }
          );
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      let normalizedMedia = [];
      let totalHits = 0;

      if (apiSource === 'pixabay' && data.hits) {
        normalizedMedia = data.hits.map(item => normalizePixabayItem(item, mediaType));
        totalHits = data.totalHits;
      } else if (apiSource === 'pexels' && data.photos) { // Pexels photos
        normalizedMedia = data.photos.map(item => normalizePexelsItem(item, 'photo'));
        totalHits = data.total_results;
      } else if (apiSource === 'pexels' && data.videos) { // Pexels videos
        normalizedMedia = data.videos.map(item => normalizePexelsItem(item, 'video'));
        totalHits = data.total_results;
      } else {
        console.warn(`${apiSource} API response did not contain expected data structure.`);
      }

      setMedia(normalizedMedia);
      setTotalPages(Math.ceil(totalHits / perPage));

    } catch (err) {
      console.error('Error fetching media:', err);
      setError(`Failed to fetch media from ${apiSource}. Please try again later. Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // useEffect hook to fetch media whenever currentSearchQuery, currentPage, mediaType, or apiSource changes
  useEffect(() => {
    fetchMedia();
  }, [currentSearchQuery, currentPage, perPage, mediaType, apiSource]); // Dependencies for useEffect

  /**
   * Handles changes in the search input field (updates searchTerm).
   * @param {Object} e - The event object from the input field.
   */
  const handleSearchInputChange = (e) => {
    setSearchTerm(e.target.value);
  };

  /**
   * Handles search submission (e.g., pressing Enter).
   * Updates currentSearchQuery and resets page to 1.
   * @param {Object} e - The event object from the form.
   */
  const handleSearchSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission behavior (page reload)
    setCurrentSearchQuery(searchTerm); // This will trigger the useEffect to fetch new data
    setCurrentPage(1); // Reset to first page on new search
  };

  /**
   * Navigates to the previous page.
   */
  const goToPreviousPage = () => {
    setCurrentPage((prevPage) => Math.max(1, prevPage - 1));
  };

  /**
   * Navigates to the next page.
   */
  const goToNextPage = () => {
    setCurrentPage((prevPage) => Math.min(totalPages, prevPage + 1));
  };

  /**
   * Handles download click based on media type.
   * For photos, draws text onto canvas. For videos, provides direct link.
   * @param {Object} item - The media item to download.
   */
  const handleDownloadClick = (item) => {
    if (item.type === 'photo') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Important for CORS when drawing images from other domains
      img.src = item.largeURL; // Use normalized largeURL

      img.onload = () => {
        // Set canvas dimensions to match the image
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        // Add overlay for text
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, canvas.height - 150, canvas.width, 150); // Adjusted height for less text

        ctx.fillStyle = 'white'; // Text color
        ctx.shadowColor = 'black'; // Text shadow for better visibility
        ctx.shadowBlur = 5;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        // Draw Image Title
        const title = item.tags?.split(',')[0] || 'Untitled';
        ctx.font = `${Math.min(canvas.width / 25, 40)}px Inter, sans-serif`; // Responsive font size
        ctx.textAlign = 'center';
        ctx.fillText(title, canvas.width / 2, canvas.height - 90);

        // Draw User
        const userText = `By: ${item.user}`;
        ctx.font = `${Math.min(canvas.width / 35, 20)}px Inter, sans-serif`; // Responsive font size
        ctx.fillText(userText, canvas.width / 2, canvas.height - 60);

        // Initiate download
        const link = document.createElement('a');
        link.download = `${item.source.toLowerCase()}_photo_${item.id}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9); // Get image data as JPEG with 90% quality
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      img.onerror = () => {
        console.error('Failed to load image for canvas drawing:', item.largeURL);
        setError('Could not prepare image for download. Please try another image.');
      };
    } else { // mediaType === 'video'
      if (item.largeURL) { // Use normalized largeURL for video download
        const link = document.createElement('a');
        link.href = item.largeURL;
        link.download = `${item.source.toLowerCase()}_video_${item.id}.mp4`; // Suggest .mp4 extension
        link.target = '_blank'; // Open in new tab/window for direct download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setError('No download URL available for this video.');
      }
    }
  };

  // JSX for rendering the component
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-inter p-4 sm:p-8 flex flex-col items-center">
      {/* Hidden Canvas for photo processing */}
      <canvas ref={canvasRef} className="hidden"></canvas>

      {/* Header Section */}
      <header className="w-full max-w-4xl text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-bold text-indigo-400 mb-4">
          QuantXimages
        </h1>
        <p className="text-lg sm:text-xl text-gray-300">
          Explore and download beautiful photos and videos from Pixabay and Pexels.
        </p>
      </header>

      {/* API Source Selection */}
      <div className="flex justify-center mb-6 bg-gray-800 rounded-full p-2 shadow-inner">
        <button
          onClick={() => { setApiSource('pixabay'); setCurrentPage(1); setCurrentSearchQuery(searchTerm); }}
          className={`px-6 py-3 rounded-full text-lg font-semibold transition-colors duration-300 ${
            apiSource === 'pixabay'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Pixabay
        </button>
        <button
          onClick={() => { setApiSource('pexels'); setCurrentPage(1); setCurrentSearchQuery(searchTerm); }}
          className={`ml-4 px-6 py-3 rounded-full text-lg font-semibold transition-colors duration-300 ${
            apiSource === 'pexels'
              ? 'bg-green-600 text-white shadow-md'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        > {/* This was where the extra '}' was causing the syntax error */}
          Pexels
        </button>
      </div>

      {/* Media Type Selection */}
      <div className="flex justify-center mb-8 bg-gray-800 rounded-full p-2 shadow-inner">
        <button
          onClick={() => { setMediaType('photo'); setCurrentPage(1); setCurrentSearchQuery(searchTerm); }} // Reset page on type change
          className={`px-6 py-3 rounded-full text-lg font-semibold transition-colors duration-300 ${
            mediaType === 'photo'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Photos
        </button>
        <button
          onClick={() => { setMediaType('video'); setCurrentPage(1); setCurrentSearchQuery(searchTerm); }} // Reset page on type change
          className={`ml-4 px-6 py-3 rounded-full text-lg font-semibold transition-colors duration-300 ${
            mediaType === 'video'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Videos
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="w-full max-w-xl mb-8">
        <div className="relative">
          <input
            type="text"
            value={searchTerm} // Binds input to searchTerm
            onChange={handleSearchInputChange} // Updates searchTerm on change
            placeholder={`Search for ${mediaType === 'photo' ? 'images' : 'videos'}...`}
            className="w-full p-4 pl-12 pr-4 rounded-xl bg-gray-800 border border-gray-700 focus:border-indigo-500 focus:ring focus:ring-indigo-500 focus:ring-opacity-50 text-white placeholder-gray-400 shadow-lg"
          />
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {/* Search Icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
        </div>
      </form>

      {/* Loading, Error, or No Media Found Messages */}
      {loading && (
        <div className="text-indigo-400 text-2xl font-semibold flex items-center justify-center">
          <svg
            className="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Loading {mediaType}s...
        </div>
      )}

      {error && (
        <div className="text-red-500 text-lg font-medium p-4 bg-red-900 bg-opacity-30 rounded-lg shadow-md max-w-xl text-center">
          {error}
        </div>
      )}

      {!loading && !error && media.length === 0 && (
        <div className="text-gray-400 text-xl">No {mediaType}s found for "{currentSearchQuery}". Try a different search!</div>
      )}

      {/* Media Grid */}
      {!loading && !error && media.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-6xl mt-4">
          {media.map((item) => {
            return (
              <div
                key={item.id}
                className="relative bg-gray-800 rounded-xl overflow-hidden shadow-lg transform transition-transform duration-300 hover:scale-105 hover:shadow-2xl group"
              >
                {item.type === 'photo' ? (
                  <img
                    src={item.previewURL} // Use normalized previewURL for display in grid
                    alt={item.tags}
                    className="w-full h-64 object-cover object-center rounded-t-xl"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = `https://placehold.co/600x400/374151/D1D5DB?text=Image+Load+Error`;
                    }}
                  />
                ) : (
                  <video
                    src={item.previewURL} // Use normalized previewURL for video in grid
                    poster={item.posterURL} // Use normalized posterURL for video thumbnail
                    controls={false} // No controls for preview
                    loop
                    muted
                    playsInline
                    className="w-full h-64 object-cover object-center rounded-t-xl"
                    onMouseEnter={e => {
                      if (e.target.readyState >= 2) { // Ensure video has enough data to play
                        e.target.play().catch(error => console.error("Video autoplay failed:", error));
                      }
                    }}
                    onMouseLeave={e => e.target.pause()}
                    onError={(e) => {
                      console.error('Video element encountered an error for ID:', item.id, 'Source:', e.target.src, 'Poster attempted:', item.posterURL, e);
                      // Fallback to a clear error poster
                      e.target.poster = `https://placehold.co/600x400/FF0000/FFFFFF?text=Video+Error`;
                      // Optionally, remove src to prevent infinite loading attempts
                      e.target.src = '';
                    }}
                  >
                    Your browser does not support the video tag.
                  </video>
                )}

                {/* Overlay for details and download button */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <h3 className="text-lg font-semibold text-white mb-2 truncate">
                    {item.tags?.split(',')[0] || item.tags || 'Untitled'}
                  </h3>
                  <p className="text-sm text-gray-300 mb-4">
                    By: {item.user} ({item.source})
                  </p>
                  <button
                    onClick={() => handleDownloadClick(item)}
                    className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm transition-all duration-300 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mr-2"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download {item.type === 'photo' ? 'Photo' : 'Video'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && !error && media.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-center mt-12 space-x-4">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage === 1 || loading}
            className={`px-6 py-3 rounded-lg font-semibold text-lg transition-colors duration-300 ${
              currentPage === 1 || loading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
            }`}
          >
            Previous
          </button>
          <span className="text-xl font-medium text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={goToNextPage}
            disabled={currentPage === totalPages || loading}
            className={`px-6 py-3 rounded-lg font-semibold text-lg transition-colors duration-300 ${
              currentPage === totalPages || loading
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md'
            }`}
          >
            Next
          </button>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} QuantXimages. All rights reserved.</p>
        <p>Media powered by <a href="https://pixabay.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Pixabay</a> and <a href="https://www.pexels.com/" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">Pexels</a></p>
      </footer>
    </div>
  );
}
