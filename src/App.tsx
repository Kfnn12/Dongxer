import { useState, useEffect, useRef } from 'react';
import { Search, Play, MonitorPlay, FastForward, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function App() {
  const [query, setQuery] = useState('');
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
  const [searchPage, setSearchPage] = useState(1);
  const [hasNextSearchPage, setHasNextSearchPage] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  
  const sliderRef = useRef<HTMLDivElement>(null);

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
      } else {
        setGlobalError(data.message || "Failed to load latest releases.");
      }
    } catch(e: any) {
      console.error(e);
      setGlobalError(e.message || "Network error while fetching latest releases.");
    }
    setLoading(false);
  }

  const performSearch = async (searchStr: string, page: number = 1) => {
    setQuery(searchStr);
    setSearchPage(page);
    setLoading(true);
    setGlobalError(null);
    setAnimeDetail(null);
    setWatchingIframe(null);
    setPlayerError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchStr)}&page=${page}`);
      const data = await res.json();
      if (data.success) {
        setResults(data.results);
        setHasNextSearchPage(data.hasNextPage);
        if (data.results.length === 0 && page === 1) {
          setGlobalError(`No anime found for "${searchStr}". Please try a different search term.`);
        }
      } else {
        setResults([]);
        setGlobalError(data.message || "Failed to search anime.");
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
    if (!query) return;
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
        setGlobalError(data.message || "Failed to load anime details.");
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
         setPlayerError(data?.message || "Failed to fetch stream configuration.");
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
    <div className="min-h-screen bg-neutral-950 text-neutral-50 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-neutral-900 border-b border-neutral-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={goHome}>
            <MonitorPlay className="w-8 h-8 text-rose-600" />
            <h1 className="text-2xl font-bold tracking-tight text-white">DONG<span className="text-rose-600">XER</span></h1>
          </div>
          
          <form onSubmit={handleSearch} className="relative flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Search anime..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-neutral-800 text-white rounded-full py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-rose-600 transition"
            />
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
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
                        onClick={() => performSearch(genre, 1)}
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
                  onClick={() => performSearch(query, Math.max(1, searchPage - 1))}
                  disabled={searchPage === 1 || loading}
                  className="px-6 py-2 bg-neutral-900 border border-neutral-700 hover:border-rose-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Previous
                </button>
                <div className="font-bold text-rose-500 bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-lg">
                  Page {searchPage}
                </div>
                <button 
                  onClick={() => performSearch(query, searchPage + 1)}
                  disabled={!hasNextSearchPage || loading}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Next
                </button>
              </div>
            </motion.div>
          ) : latestReleases.length > 0 ? (
             <motion.div key="latest" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
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
                  disabled={loading}
                  className="px-6 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold text-white transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  Next
                </button>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>
    </div>
  );
}

function AnimeCard({ data, onClick }: { data: any, onClick: () => void }) {
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
