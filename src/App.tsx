import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Play, MonitorPlay, FastForward, AlertTriangle, ChevronLeft, ChevronRight, Filter, X, Github, Twitter, Mail, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

function App() {
  const [query, setQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [latestReleases, setLatestReleases] = useState<any[]>([]);
  
  const [selectedAnimeUrl, setSelectedAnimeUrl] = useState<string | null>(null);
  const [animeDetail, setAnimeDetail] = useState<any | null>(null);
  
  const [watchingIframe, setWatchingIframe] = useState<string | null>(null);
  const [servers, setServers] = useState<{name: string, iframe: string}[]>([]);
  const [selectedServerIndex, setSelectedServerIndex] = useState<number>(0);
  const [currentEpIndex, setCurrentEpIndex] = useState<number | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [latestPage, setLatestPage] = useState(1);
  const [hasNextLatestPage, setHasNextLatestPage] = useState(true);
  const [searchPage, setSearchPage] = useState(1);
  const [hasNextSearchPage, setHasNextSearchPage] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  const sliderRef = useRef<HTMLDivElement>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [filterGenre, setFilterGenre] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Auto-scroll episodes slider to active episode
  useEffect(() => {
    if (sliderRef.current && currentEpIndex !== null) {
      const activeElement = sliderRef.current.children[currentEpIndex] as HTMLElement;
      if (activeElement) {
        // Calculate position to center the active item
        const containerCenter = sliderRef.current.clientWidth / 2;
        const itemCenter = activeElement.offsetLeft + (activeElement.clientWidth / 2);
        sliderRef.current.scrollTo({
          left: itemCenter - containerCenter,
          behavior: 'smooth'
        });
      }
    }
  }, [currentEpIndex]);

  // Fetch Latest Releases
  useEffect(() => {
    fetchLatest(latestPage);
  }, [latestPage]);

  const fetchLatest = async (page: number) => {
    setLoading(true);
    setGlobalError(null);
    try {
      const res = await fetch(`/api/latest?page=${page}`);
      const data = await res.json();
      if (data.success) {
        setLatestReleases(data.results.slice(0, 10)); // Top 10 from the fetched page
        setHasNextLatestPage(data.hasNextPage);
      } else {
        const errorMsg = data.status ? `[Error ${data.status}] ${data.message}` : data.message || "Failed to load latest releases.";
        setGlobalError(errorMsg);
      }
    } catch(e: any) {
      console.error(e);
      setGlobalError(e.message || "Network error while fetching latest releases.");
    }
    setLoading(false);
  }

  const performSearch = async (searchStr: string, page: number = 1, genreStr?: string, statusStr?: string, typeStr?: string) => {
    // use explicitly passed values, or fallback to current state
    const useGenre = genreStr !== undefined ? genreStr : filterGenre;
    const useStatus = statusStr !== undefined ? statusStr : filterStatus;
    const useType = typeStr !== undefined ? typeStr : filterType;

    setQuery(searchStr);
    setActiveQuery(searchStr);
    setSearchPage(page);
    setLoading(true);
    setGlobalError(null);
    setAnimeDetail(null);
    setWatchingIframe(null);
    setPlayerError(null);
    try {
      let endpoint = `/api/search?page=${page}`;
      if (searchStr) endpoint += `&q=${encodeURIComponent(searchStr)}`;
      if (useGenre) endpoint += `&genre=${encodeURIComponent(useGenre)}`;
      if (useStatus) endpoint += `&status=${encodeURIComponent(useStatus)}`;
      if (useType) endpoint += `&type=${encodeURIComponent(useType)}`;

      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
        setHasNextSearchPage(data.hasNextPage);
        if (data.results.length === 0 && page === 1) {
          setGlobalError(`No anime found for your search criteria. Please try different filters or search terms.`);
        }
      } else {
        setResults([]);
        const errorMsg = data.status ? `[Error ${data.status}] ${data.message}` : data.message || "Failed to search anime.";
        setGlobalError(errorMsg);
      }
    } catch(err: any) {
      console.error(err);
      setResults([]);
      setGlobalError(err.message || "Network error while searching.");
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, 1);
  };

  const loadAnimeDetails = async (url: string) => {
    setLoading(true);
    setGlobalError(null);
    setSelectedAnimeUrl(url);
    setWatchingIframe(null);
    setServers([]);
    setCurrentEpIndex(null);
    setPlayerError(null);
    try {
      const res = await fetch(`/api/info?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (data.success) {
        setAnimeDetail(data.info);
        if (data.info.requestedIndex !== -1 && data.info.requestedIndex !== undefined) {
          // Fire and forget auto-play, let it handle its own loading state without blocking here.
          // Need to call it async so it doesn't block the UI update of setAnimeDetail
          setTimeout(() => {
            watchEpisode(data.info.episodes[data.info.requestedIndex].link, data.info.requestedIndex);
          }, 0);
        }
      } else {
        const errorMsg = data.status ? `[Error ${data.status}] ${data.message}` : data.message || "Failed to load anime details.";
        setGlobalError(errorMsg);
      }
    } catch(err: any) {
      console.error(err);
      setGlobalError(err.message || "Network error while fetching details.");
    }
    setLoading(false);
  };

  const watchEpisode = async (url: string, index: number) => {
    setLoading(true);
    setCurrentEpIndex(index);
    setPlayerError(null);
    setWatchingIframe(null);
    setServers([]);
    try {
      const res = await fetch(`/api/watch?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
         const errorMsg = data?.status ? `[Error ${data.status}] ${data.message}` : data?.message || "Failed to fetch stream configuration.";
         setPlayerError(errorMsg);
         setLoading(false);
         return;
      }
      
      if (data.servers && data.servers.length > 0) {
        setServers(data.servers);
        setSelectedServerIndex(0);
        setWatchingIframe(data.servers[0].iframe);
      } else if (data.stream && data.stream.iframe) {
        setServers([]);
        setWatchingIframe(data.stream.iframe);
      } else {
        setPlayerError("No playable stream was found for this episode.");
      }
    } catch(err: any) {
      console.error(err);
      setPlayerError(err.message || "An error occurred while loading the episode stream. Please try again later.");
    }
    setLoading(false);
  };

  const goHome = () => {
    setResults([]);
    setQuery('');
    setActiveQuery('');
    setSearchPage(1);
    setAnimeDetail(null);
    setWatchingIframe(null);
    setServers([]);
    setSelectedAnimeUrl(null);
    setCurrentEpIndex(null);
    setPlayerError(null);
    setGlobalError(null);
    setLatestPage(1);
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-neutral-900 border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
            <MonitorPlay className="w-8 h-8 text-rose-600" />
            <h1 className="text-2xl font-bold tracking-tight text-white">DONG<span className="text-rose-600">XER</span></h1>
          </div>
          
            {/* Search Bar Container */}
            <div className="relative flex-1 max-w-xl">
              <form onSubmit={handleSearch} className="relative w-full flex items-center">
                <Search className="absolute left-3 w-5 h-5 text-neutral-400 pointer-events-none" />
                <input 
                  type="text" 
                  placeholder="Search anime..." 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full bg-neutral-800 text-white rounded-full py-2.5 pl-10 pr-12 focus:outline-none focus:ring-2 focus:ring-rose-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`absolute right-2 p-1.5 rounded-full transition-colors ${showFilters ? 'bg-rose-600 text-white' : 'text-neutral-400 hover:text-white hover:bg-neutral-700'}`}
                >
                  <Filter className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
          
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-neutral-800 mt-4"
              >
                <div className="max-w-6xl mx-auto py-4 px-4 flex flex-wrap gap-4 items-end">
                  {/* Genre */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Genre</label>
                    <select 
                      value={filterGenre} 
                      onChange={(e) => setFilterGenre(e.target.value)}
                      className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-lg focus:ring-rose-500 focus:border-rose-500 block p-2 transition outline-none"
                    >
                      <option value="">All Genres</option>
                      {['Action', 'Adventure', 'Comedy', 'Cultivation', 'Demon', 'Drama', 'Fantasy', 'Harem', 'Historical', 'Martial Arts', 'Mecha', 'Mystery', 'Romance', 'School', 'Sci-Fi', 'Shounen', 'Slice of Life', 'Supernatural'].map(g => (
                        <option key={g} value={g.toLowerCase().replace(' ', '-')}>{g}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Status */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Status</label>
                    <select 
                      value={filterStatus} 
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-lg focus:ring-rose-500 focus:border-rose-500 block p-2 transition outline-none"
                    >
                      <option value="">All Statuses</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="hiatus">Hiatus</option>
                    </select>
                  </div>

                  {/* Type */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Type</label>
                    <select 
                      value={filterType} 
                      onChange={(e) => setFilterType(e.target.value)}
                      className="bg-neutral-900 border border-neutral-700 text-white text-sm rounded-lg focus:ring-rose-500 focus:border-rose-500 block p-2 transition outline-none"
                    >
                      <option value="">All Types</option>
                      <option value="tv">TV Series</option>
                      <option value="ova">OVA</option>
                      <option value="movie">Movie</option>
                      <option value="live-action">Live Action</option>
                      <option value="special">Special</option>
                      <option value="bd">BD</option>
                      <option value="ona">ONA</option>
                    </select>
                  </div>

                  {/* Apply Filters Button */}
                  <button
                    onClick={() => performSearch(query, 1)}
                    className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold text-sm transition-all"
                  >
                    Apply Filters
                  </button>
                  
                  {/* Clear Filters */}
                  {(filterGenre || filterStatus || filterType) && (
                    <button
                      onClick={() => {
                        setFilterGenre('');
                        setFilterStatus('');
                        setFilterType('');
                        if (!query) {
                          goHome();
                          setShowFilters(false);
                        } else {
                          performSearch(query, 1, '', '', '');
                        }
                      }}
                      className="px-4 py-2 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-lg font-semibold text-sm transition-all flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-6xl mx-auto px-4 py-8 w-full">
        {globalError && (
          <div className="mb-8 p-4 bg-rose-950/50 border border-rose-800 rounded-lg flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
            <div>
              <h3 className="text-lg font-bold text-rose-400 mb-1">Error</h3>
              <p className="text-rose-200/80">{globalError}</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {(watchingIframe || playerError) && (
            <div className="mb-8 block">
              <motion.div 
                key="player"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full relative pt-[56.25%] rounded-xl overflow-hidden shadow-2xl shadow-rose-900/20 bg-black border border-neutral-800"
              >
                {playerError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-neutral-900">
                    <AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">Stream Unavailable</h3>
                    <p className="text-neutral-400 max-w-md">{playerError}</p>
                  </div>
                ) : (
                  <iframe 
                    src={watchingIframe!} 
                    className="absolute inset-0 w-full h-full border-0" 
                    allowFullScreen 
                  />
                )}
              </motion.div>
              
              {servers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 bg-neutral-900 p-4 rounded-xl border border-neutral-800">
                  <span className="text-sm font-semibold text-neutral-400 mr-2 flex items-center">Servers:</span>
                  {servers.map((srv: any, idx: number) => (
                    <button
                     key={idx}
                     onClick={() => { setSelectedServerIndex(idx); setWatchingIframe(srv.iframe); }}
                     className={`px-3 py-1.5 text-xs font-bold rounded transition inline-flex items-center gap-1.5 shadow-sm ${selectedServerIndex === idx ? 'bg-rose-600 shadow-rose-900/50 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white'}`}
                    >
                      <MonitorPlay className="w-3.5 h-3.5" />
                      {srv.name}
                    </button>
                  ))}
                </div>
              )}

              {animeDetail && currentEpIndex !== null && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-4 bg-neutral-900 p-4 rounded-xl border border-neutral-800 gap-4">
                  <button 
                    onClick={() => watchEpisode(animeDetail.episodes[currentEpIndex - 1].link, currentEpIndex - 1)}
                    disabled={currentEpIndex <= 0}
                    className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold tracking-wide text-white transition-colors w-full sm:w-auto"
                  >
                    Previous Episode
                  </button>
                  <div className="font-bold text-rose-500 text-center flex-1">
                    {animeDetail.episodes[currentEpIndex].title}
                  </div>
                  <button 
                    onClick={() => watchEpisode(animeDetail.episodes[currentEpIndex + 1].link, currentEpIndex + 1)}
                    disabled={currentEpIndex >= animeDetail.episodes.length - 1}
                    className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold tracking-wide text-white transition-colors w-full sm:w-auto"
                  >
                    Next Episode
                  </button>
                </div>
              )}
            </div>
          )}

          {animeDetail ? (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col md:flex-row gap-8"
            >
              <div className="md:w-1/3 flex-shrink-0">
                <img src={animeDetail.poster} alt={animeDetail.title} className="w-full rounded-lg shadow-xl shadow-black/50" />
              </div>
              <div className="flex-1">
                <h2 className="text-4xl font-black text-white mb-4">{animeDetail.title}</h2>
                <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800 mb-4 max-h-64 overflow-y-auto">
                  <p className="text-neutral-300 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                    {animeDetail.description}
                  </p>
                </div>
                
                {animeDetail.genres && animeDetail.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {animeDetail.genres.map((genre: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => {
                          const genreVal = genre.toLowerCase().replace(' ', '-');
                          setFilterGenre(genreVal);
                          setFilterStatus('');
                          setFilterType('');
                          setQuery('');
                          setShowFilters(true);
                          performSearch('', 1, genreVal, '', '');
                        }}
                        className="px-3 py-1 bg-neutral-800 hover:bg-rose-600 border border-neutral-700 hover:border-rose-500 rounded-full text-xs font-semibold text-neutral-300 hover:text-white transition-colors"
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                )}
                
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <FastForward className="w-6 h-6 text-rose-500" /> 
                  Episodes ({animeDetail.episodes.length})
                </h3>
                
                <div 
                  ref={sliderRef}
                  className="flex overflow-x-auto gap-3 pb-4 mb-4 snap-x custom-scrollbar scroll-smooth relative"
                >
                  {animeDetail.episodes.map((ep: any, idx: number) => (
                    <button 
                      key={idx}
                      onClick={() => watchEpisode(ep.link, idx)}
                      className={`flex flex-col flex-shrink-0 w-60 p-3 border rounded-lg text-left transition-all snap-start group ${currentEpIndex === idx ? 'bg-rose-900 border-rose-600' : 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 hover:border-neutral-700'}`}
                    >
                      <span className="text-xs text-rose-400 font-bold mb-1 uppercase tracking-wider">{ep.num || `EPISODE ${idx + 1}`}</span>
                      <span className="text-sm font-medium text-white truncate w-full transition-colors">{ep.title || `Episode ${idx + 1}`}</span>
                      <span className="text-xs text-neutral-500 mt-2">{ep.date}</span>
                    </button>
                  ))}
                </div>

                {animeDetail.recommended && animeDetail.recommended.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-neutral-800">
                    <h3 className="text-2xl font-bold mb-6 text-neutral-200">Recommended Series</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {animeDetail.recommended.map((res: any, idx: number) => (
                        <AnimeCard key={idx} data={res} onClick={() => loadAnimeDetails(res.link)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : results.length > 0 ? (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="text-2xl font-bold mb-6 text-neutral-200">Search Results</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {results.map((res: any, idx: number) => (
                  <AnimeCard key={idx} data={res} onClick={() => loadAnimeDetails(res.link)} />
                ))}
              </div>
              <div className="flex justify-center items-center gap-4 mt-8">
                <button 
                  onClick={() => performSearch(activeQuery, Math.max(1, searchPage - 1))}
                  disabled={searchPage === 1 || loading}
                  className="px-6 py-2 bg-neutral-900 border border-neutral-700 hover:border-rose-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Previous
                </button>
                <div className="font-bold text-rose-500 bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-lg">
                  Page {searchPage}
                </div>
                <button 
                  onClick={() => performSearch(activeQuery, searchPage + 1)}
                  disabled={!hasNextSearchPage || loading}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Next
                </button>
              </div>
            </motion.div>
          ) : latestReleases.length > 0 ? (
             <motion.div key="latest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {latestPage === 1 && <HeroSlider items={latestReleases.slice(0, 5)} onClick={loadAnimeDetails} />}
              <h2 className="text-2xl font-bold mb-6 text-neutral-200">Latest Updates</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 shadow-xl">
                {latestReleases.map((res: any, idx: number) => (
                  <AnimeCard key={idx} data={res} onClick={() => loadAnimeDetails(res.link)} />
                ))}
              </div>
              <div className="flex justify-center items-center gap-4 mt-8">
                <button 
                  onClick={() => setLatestPage(p => Math.max(1, p - 1))}
                  disabled={latestPage === 1 || loading}
                  className="px-6 py-2 bg-neutral-900 border border-neutral-700 hover:border-rose-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Previous
                </button>
                <div className="font-bold text-rose-500 bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-lg">
                  Page {latestPage}
                </div>
                <button 
                  onClick={() => setLatestPage(p => p + 1)}
                  disabled={!hasNextLatestPage || loading}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Next
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Advanced Footer */}
      <footer className="bg-neutral-950 border-t border-neutral-900 mt-12 pt-12 pb-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <MonitorPlay className="w-6 h-6 text-rose-600" />
                <h2 className="text-xl font-bold tracking-tight text-white">DONG<span className="text-rose-600">XER</span></h2>
              </div>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Your ultimate destination for Donghua (Chinese Anime). Watch the latest episodes with high quality subtitles and lightning fast streams.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><a href="#" className="hover:text-rose-500 transition-colors">Home</a></li>
                <li><a href="#" className="hover:text-rose-500 transition-colors">Latest Episodes</a></li>
                <li><a href="#" className="hover:text-rose-500 transition-colors">Popular Series</a></li>
                <li><a href="#" className="hover:text-rose-500 transition-colors">A-Z List</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-neutral-400">
                <li><a href="#" className="hover:text-rose-500 transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-rose-500 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-rose-500 transition-colors">Request Anime</a></li>
                <li><a href="#" className="hover:text-rose-500 transition-colors">Report Error</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Connect</h3>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400 hover:bg-rose-600 hover:text-white transition-all transform hover:-translate-y-1">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400 hover:bg-rose-600 hover:text-white transition-all transform hover:-translate-y-1">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center text-neutral-400 hover:bg-rose-600 hover:text-white transition-all transform hover:-translate-y-1">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-neutral-900 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-neutral-500 text-sm text-center md:text-left">
              &copy; {new Date().getFullYear()} DONGXER. All rights reserved. This site does not store any files on its server.
            </p>
            <p className="text-neutral-500 text-sm flex items-center gap-1">
              Made with <Heart className="w-4 h-4 text-rose-600" /> for Donghua fans
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const HeroSlider: React.FC<{ items: any[], onClick: (url: string) => void }> = ({ items, onClick }) => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 4000 })]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (!items || items.length === 0) return null;

  return (
    <div className="relative mb-12 rounded-2xl overflow-hidden group">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {items.map((item, index) => (
            <div className="flex-[0_0_100%] min-w-0 relative h-[40vh] md:h-[50vh]" key={index}>
              <img
                src={item.img}
                alt={item.title}
                className="absolute inset-0 w-full h-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
              <div className="absolute inset-0 flex items-end">
                <div className="p-8 md:p-12 max-w-3xl">
                  {item.type && (
                    <span className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-full mb-4 inline-block">
                      {item.type}
                    </span>
                  )}
                  {item.ep && !item.type && (
                    <span className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-full mb-4 inline-block">
                      {item.ep}
                    </span>
                  )}
                  <h2 className="text-3xl md:text-5xl font-black text-white mb-4 line-clamp-2 leading-tight">
                    {item.title}
                  </h2>
                  <button
                    onClick={() => onClick(item.link)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-full font-bold hover:bg-rose-600 hover:text-white transition-colors duration-300"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Watch Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={scrollPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-rose-600 text-white rounded-full flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={scrollNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-rose-600 text-white rounded-full flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};

const AnimeCard: React.FC<{ data: any, onClick: () => void | Promise<void> }> = ({ data, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="group relative bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden cursor-pointer hover:-translate-y-1 transition duration-300"
    >
      <div className="aspect-[3/4] relative overflow-hidden bg-neutral-950">
        <img 
          src={data.img} 
          alt={data.title} 
          className="object-cover w-full h-full opacity-90 group-hover:opacity-100 group-hover:scale-110 transition-transform duration-500 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent z-0 group-hover:via-black/50 transition-colors duration-500"></div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-500 z-0"></div>
        {data.ep && (
          <div className="absolute top-2 left-2 bg-rose-600 px-2 py-1 text-xs font-bold rounded shadow-lg z-10">
            {data.ep}
          </div>
        )}
        {data.type && (
          <div className="absolute top-2 right-2 bg-neutral-800/80 backdrop-blur px-2 py-1 text-xs font-bold rounded text-neutral-300 z-10">
            {data.type}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10">
          <div className="bg-rose-600 p-4 rounded-full shadow-2xl transform scale-50 group-hover:scale-100 transition-all duration-300 ease-out">
            <Play className="w-8 h-8 text-white ml-1 fill-white" />
          </div>
        </div>
      </div>
      <div className="p-3 bg-neutral-900 group-hover:bg-neutral-800 transition-colors">
        <h3 className="font-semibold text-sm line-clamp-2 leading-snug group-hover:text-rose-400 transition-colors">
          {data.title}
        </h3>
      </div>
    </div>
  );
}

export default App;
