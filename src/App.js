import React, { useState, useEffect, useRef } from 'react';

// Main App component
export default function App() {
  // State variables for managing the application
  const [media, setMedia] = useState([]); // Stores the fetched media data (photos or videos)
  const [query, setQuery] = useState('nature'); // Current search query, default to 'nature'
  const [loading, setLoading] = useState(true); // Loading state for API calls
  const [error, setError] = useState(null); // Error message if API call fails
  const [currentPage, setCurrentPage] = useState(1); // Current page for pagination
  const [totalPages, setTotalPages] = useState(1); // Total pages available from Pixabay
  const [perPage, setPerPage] = useState(20); // Number of media items per page (can be adjusted)
  const [mediaType, setMediaType] = useState('photo'); // 'photo' or 'video'

  // Ref to the hidden canvas element for photo text overlay
  const canvasRef = useRef(null);

  // Pixabay API Key and URLs
  // IMPORTANT: Replace 'YOUR_PIXABAY_API_KEY' with your actual Pixabay API key.
  // Get your key from: https://pixabay.com/api/docs/
  const PIXABAY_API_KEY = '49507277-8909a8996bad61e590d8d5a88'; // Your Pixabay API Key
  const PIXABAY_PHOTO_API_URL = `https://pixabay.com/api/?key=${PIXABAY_API_KEY}`;
  const PIXABAY_VIDEO_API_URL = `https://pixabay.com/api/videos/?key=${PIXABAY_API_KEY}`;

  /**
   * Fetches media from the Pixabay API based on the current query, media type, and page.
   */
  const fetchMedia = async () => {
    setLoading(true); // Set loading to true before fetching
    setError(null); // Clear any previous errors
    setMedia([]); // Clear previous media when fetching new ones

    try {
      let response;
      if (mediaType === 'photo') {
        response = await fetch(
          `${PIXABAY_PHOTO_API_URL}&q=${encodeURIComponent(query)}&image_type=photo&orientation=vertical&safesearch=true&page=${currentPage}&per_page=${perPage}`
        );
      } else { // mediaType === 'video'
        response = await fetch(
          `${PIXABAY_VIDEO_API_URL}&q=${encodeURIComponent(query)}&video_type=all&safesearch=true&page=${currentPage}&per_page=${perPage}`
        );
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.hits) {
        setMedia(data.hits); // Update media state with fetched data
        // Calculate total pages based on totalHits from Pixabay API
        setTotalPages(Math.ceil(data.totalHits / perPage));
      } else {
        setMedia([]);
        setTotalPages(1); // Reset total pages if no hits
        console.warn('Pixabay API response did not contain "hits" array or it was empty.');
      }
    } catch (err) {
      console.error('Error fetching media:', err);
      setError('Failed to fetch media. Please try again later.');
    } finally {
      setLoading(false); // Set loading to false after fetching (success or failure)
    }
  };

  // useEffect hook to fetch media whenever query, currentPage, or mediaType changes
  useEffect(() => {
    fetchMedia();
  }, [query, currentPage, perPage, mediaType]); // Dependencies for useEffect

  /**
   * Handles changes in the search input field.
   * @param {Object} e - The event object from the input field.
   */
  const handleSearchChange = (e) => {
    setQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  /**
   * Handles search submission (e.g., pressing Enter).
   * @param {Object} e - The event object from the form.
   */
  const handleSearchSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission behavior (page reload)
    // fetchMedia will be called by useEffect due to query change
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
    if (mediaType === 'photo') {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Important for CORS when drawing images from other domains
      img.src = item.largeImageURL;

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
        const title = item.tags.split(',')[0] || 'Untitled';
        ctx.font = `${Math.min(canvas.width / 25, 40)}px Inter, sans-serif`; // Responsive font size
        ctx.textAlign = 'center';
        ctx.fillText(title, canvas.width / 2, canvas.height - 90);

        // Draw User
        const userText = `By: ${item.user}`;
        ctx.font = `${Math.min(canvas.width / 35, 20)}px Inter, sans-serif`; // Responsive font size
        ctx.fillText(userText, canvas.width / 2, canvas.height - 60);

        // Initiate download
        const link = document.createElement('a');
        link.download = `pixabay_photo_${item.id}.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.9); // Get image data as JPEG with 90% quality
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      };

      img.onerror = () => {
        console.error('Failed to load image for canvas drawing.');
        setError('Could not prepare image for download. Please try another image.');
      };
    } else { // mediaType === 'video'
      const videoDownloadUrl = item.videos?.large?.url || item.videos?.medium?.url;
      if (videoDownloadUrl) {
        const link = document.createElement('a');
        link.href = videoDownloadUrl;
        link.download = `pixabay_video_${item.id}.mp4`; // Suggest .mp4 extension
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
          Explore and download beautiful photos and videos from Pixabay.
        </p>
      </header>

      {/* Media Type Selection */}
      <div className="flex justify-center mb-8 bg-gray-800 rounded-full p-2 shadow-inner">
        <button
          onClick={() => { setMediaType('photo'); setCurrentPage(1); }} // Reset page on type change
          className={`px-6 py-3 rounded-full text-lg font-semibold transition-colors duration-300 ${
            mediaType === 'photo'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Photos
        </button>
        <button
          onClick={() => { setMediaType('video'); setCurrentPage(1); }} // Reset page on type change
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
            value={query}
            onChange={handleSearchChange}
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
        <div className="text-gray-400 text-xl">No {mediaType}s found for "{query}". Try a different search!</div>
      )}

      {/* Media Grid */}
      {!loading && !error && media.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 w-full max-w-6xl mt-4">
          {media.map((item) => (
            <div
              key={item.id}
              className="relative bg-gray-800 rounded-xl overflow-hidden shadow-lg transform transition-transform duration-300 hover:scale-105 hover:shadow-2xl group"
            >
              {mediaType === 'photo' ? (
                <img
                  src={item.webformatURL} // Use webformatURL for display in grid
                  alt={item.tags}
                  className="w-full h-64 object-cover object-center rounded-t-xl"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://placehold.co/600x400/374151/D1D5DB?text=Image+Load+Error`;
                  }}
                />
              ) : (
                <video
                  src={item.videos?.small?.url || item.videos?.tiny?.url} // Use smaller video for grid preview
                  poster={item.videos?.picture_id ? `https://i.vimeocdn.com/video/${item.videos.picture_id}_640x360.jpg` : `https://placehold.co/600x400/374151/D1D5DB?text=Video+Thumbnail`}
                  controls={false} // No controls for preview
                  loop
                  muted
                  playsInline
                  className="w-full h-64 object-cover object-center rounded-t-xl"
                  onMouseEnter={e => e.target.play()} // Autoplay on hover
                  onMouseLeave={e => e.target.pause()} // Pause on mouse leave
                  onError={(e) => {
                    console.error('Video preview load error:', e);
                    e.target.src = '';
                    e.target.poster = `https://placehold.co/600x400/374151/D1D5DB?text=Video+Load+Error`;
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
                  By: {item.user}
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
                  Download {mediaType === 'photo' ? 'Photo' : 'Video'}
                </button>
              </div>
            </div>
          ))}
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
        <p>Media powered by <a href="https://pixabay.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Pixabay</a></p>
      </footer>
    </div>
  );
}
