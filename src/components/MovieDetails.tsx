import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Bookmark, BookmarkCheck, Check, Star, Tv, ShoppingBag, Film, Send } from 'lucide-react';
import { MediaItem, UserProfile } from '../types';
import { fetchMediaDetails, getBackdropUrl, getPosterUrl } from '../services/tmdbApi';
import { RatingBadge } from './RatingBadge';
import { StreamingBadge } from './StreamingBadge';
import { getGenreName } from '../data/genres';
import { RecommendModal } from './RecommendModal';
import { TitleCommunity } from './TitleCommunity';

interface MovieDetailsProps {
  mediaId: number;
  mediaType: 'movie' | 'tv';
  isSaved: boolean;
  isWatched: boolean;
  onBack: () => void;
  onToggleWatchlist: (item: MediaItem, status: 'watchlist' | 'watched', userRating?: number, userNote?: string) => void;
  onSelectMedia: (item: MediaItem) => void;
  userProfile: UserProfile;
  onAddToast?: (title: string, description?: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const MovieDetails: React.FC<MovieDetailsProps> = ({
  mediaId,
  mediaType,
  isSaved,
  isWatched,
  onBack,
  onToggleWatchlist,
  onSelectMedia,
  userProfile,
  onAddToast
}) => {
  const [media, setMedia] = useState<MediaItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTrailer, setActiveTrailer] = useState<string | null>(null);
  const [userRatingInput, setUserRatingInput] = useState<number>(0);
  const [userNoteInput, setUserNoteInput] = useState<string>('');
  const [recommendOpen, setRecommendOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchMediaDetails(mediaId, mediaType).then((res) => {
      if (isMounted) {
        setMedia(res);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [mediaId, mediaType]);

  if (loading || !media) {
    return (
      <div className="min-h-screen pt-24 pb-16 px-4 max-w-7xl mx-auto flex items-center justify-center">
        <div className="animate-pulse space-y-6 w-full max-w-4xl">
          <div className="h-64 sm:h-96 bg-[#151823] rounded-3xl" />
          <div className="h-8 w-1/3 bg-[#151823] rounded-xl" />
          <div className="h-20 bg-[#151823] rounded-2xl" />
        </div>
      </div>
    );
  }

  const title = media.title || media.name;
  const year = (media.release_date || media.first_air_date || '').slice(0, 4);
  const backdrop = getBackdropUrl(media.backdrop_path);
  const poster = getPosterUrl(media.poster_path);

  const flatrate = media.watch_providers?.flatrate || [];
  const rent = media.watch_providers?.rent || [];
  const buy = media.watch_providers?.buy || [];

  const trailer = media.videos?.find((v) => v.type === 'Trailer' && v.site === 'YouTube') || media.videos?.[0];

  const handleSaveNote = () => {
    onToggleWatchlist(media, isWatched ? 'watched' : 'watchlist', userRatingInput, userNoteInput);
  };

  return (
    <div className="min-h-screen pb-20 pt-16">
      {/* Back Button */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <button
          onClick={onBack}
          className="button-secondary inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4 text-[#A7A9B4]" /> Voltar ao catálogo
        </button>
      </div>

      {/* Hero Banner */}
      <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] max-h-[500px] overflow-hidden bg-[#10121A]">
        <img src={backdrop} alt={title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#07080D] via-[#07080D]/70 to-transparent" />
      </div>

      {/* Main Details Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 sm:-mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left Poster Card */}
          <div className="w-40 sm:w-60 md:w-72 shrink-0 mx-auto md:mx-0">
            <img
              src={poster}
              alt={title}
              className="w-full aspect-[2/3] object-cover rounded-3xl shadow-2xl border border-white/15"
            />

            {/* Quick Actions */}
            <div className="mt-4 space-y-2">
              <button
                onClick={() => onToggleWatchlist(media, 'watchlist')}
                className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm border transition-all flex items-center justify-center gap-2 ${
                  isSaved
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
                    : 'button-secondary'
                }`}
              >
                {isSaved ? <BookmarkCheck className="w-4 h-4 text-emerald-400" /> : <Bookmark className="w-4 h-4 text-[#A7A9B4]" />}
                <span>{isSaved ? 'Na Minha Lista' : 'Salvar em Quero Assistir'}</span>
              </button>

              <button
                onClick={() => onToggleWatchlist(media, 'watched')}
                className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm border transition-all flex items-center justify-center gap-2 ${
                  isWatched
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 hover:bg-purple-500/30'
                    : 'button-secondary'
                }`}
              >
                <Check className="w-4 h-4 text-[#A7A9B4]" />
                <span>{isWatched ? 'Já Assistido' : 'Marcar como Assistido'}</span>
              </button>

              <button
                type="button"
                onClick={() => setRecommendOpen(true)}
                className="w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm border transition-all flex items-center justify-center gap-2 bg-[#8B5CF6]/15 text-violet-200 border-[#8B5CF6]/35 hover:bg-[#8B5CF6]/25"
              >
                <Send className="w-4 h-4" />
                <span>Recomendar a amigos</span>
              </button>
            </div>
          </div>

          {/* Right Info */}
          <div className="flex-1 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-2">
                <RatingBadge rating={media.vote_average} size="lg" />
                {year && (
                  <span className="text-xs text-[#A7A9B4] px-3 py-1 rounded-full bg-white/5 border border-white/10 font-medium">
                    {year}
                  </span>
                )}
                {media.runtime && (
                  <span className="text-xs text-[#A7A9B4] px-3 py-1 rounded-full bg-white/5 border border-white/10 font-medium">
                    {media.runtime} min
                  </span>
                )}
                {media.certification && (
                  <span className="text-xs font-bold text-[#EC4899] px-2.5 py-1 rounded-md bg-[#EC4899]/10 border border-[#EC4899]/30">
                    {media.certification}
                  </span>
                )}
                <span className="text-xs text-[#A7A9B4] uppercase px-3 py-1 rounded-full bg-white/5 border border-white/10 font-medium">
                  {media.media_type === 'tv' ? 'Série' : 'Filme'}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black text-[#F7F7FA] tracking-tight leading-tight">
                {title}
              </h1>

              {media.original_title && media.original_title !== title && (
                <p className="text-xs sm:text-sm text-[#A7A9B4] italic mt-1">
                  Título original: {media.original_title}
                </p>
              )}

              <p className="text-sm font-semibold text-[#8B5CF6] mt-2">
                {media.genre_ids?.map(getGenreName).join(' • ')}
              </p>
            </div>

            {/* Synopsis */}
            <div className="bg-[#151823]/80 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
              <h3 className="text-xs font-bold text-[#A7A9B4] uppercase tracking-wider mb-2">Sinopse</h3>
              <p className="text-sm sm:text-base text-[#F7F7FA] leading-relaxed">
                {media.overview || 'Sinopse não cadastrada.'}
              </p>
            </div>

            {/* Streaming Availability in Brazil */}
            <div className="bg-[#151823]/80 p-5 rounded-2xl border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-[#F7F7FA] uppercase tracking-wider flex items-center gap-2">
                <Tv className="w-4 h-4 text-[#8B5CF6]" />
                <span>Onde Assistir no Brasil</span>
              </h3>

              {/* Flatrate */}
              <div>
                <p className="text-xs text-[#A7A9B4] font-medium mb-2">Incluído na assinatura:</p>
                {flatrate.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-3">
                    {flatrate.map((p) => (
                      <div key={p.provider_id} className="flex items-center gap-2 bg-[#10121A] px-3 py-2 rounded-xl border border-white/5">
                        <StreamingBadge provider={p} size="sm" />
                        <span className="text-xs font-bold text-white">{p.provider_name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#A7A9B4] italic">
                    Não encontramos disponibilidade em serviços de assinatura no Brasil no momento.
                  </p>
                )}
              </div>

              {/* Rent / Buy */}
              {(rent.length > 0 || buy.length > 0) && (
                <div className="pt-3 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {rent.length > 0 && (
                    <div>
                      <p className="text-[#A7A9B4] font-medium mb-1.5 flex items-center gap-1">
                        <Film className="w-3.5 h-3.5 text-amber-400" /> Alugar:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {rent.map((p) => (
                          <StreamingBadge key={p.provider_id} provider={p} size="sm" />
                        ))}
                      </div>
                    </div>
                  )}
                  {buy.length > 0 && (
                    <div>
                      <p className="text-[#A7A9B4] font-medium mb-1.5 flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" /> Comprar:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {buy.map((p) => (
                          <StreamingBadge key={p.provider_id} provider={p} size="sm" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Official YouTube Trailer Embed */}
            {trailer && (
              <div className="bg-[#151823]/80 p-5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#F7F7FA] uppercase tracking-wider flex items-center gap-2">
                    <Play className="w-4 h-4 text-rose-500 fill-current" />
                    <span>Trailer Oficial</span>
                  </h3>
                  {!activeTrailer && (
                    <button
                      onClick={() => setActiveTrailer(trailer.key)}
                      className="text-xs text-[#8B5CF6] hover:underline font-semibold"
                    >
                      Reproduzir
                    </button>
                  )}
                </div>

                {activeTrailer ? (
                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-black">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${activeTrailer}?autoplay=1`}
                      title="Trailer"
                      className="w-full h-full border-0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div
                    onClick={() => setActiveTrailer(trailer.key)}
                    className="relative aspect-video w-full rounded-2xl overflow-hidden bg-[#10121A] border border-white/5 group cursor-pointer flex items-center justify-center"
                  >
                    <img src={backdrop} alt="Trailer" className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform" />
                    <div className="absolute w-16 h-16 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 fill-current ml-1" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cast List */}
            {media.cast && media.cast.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#F7F7FA] uppercase tracking-wider">Elenco Principal</h3>
                <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                  {media.cast.map((person) => (
                    <div key={person.id} className="w-24 shrink-0 text-center">
                      <div className="w-16 h-16 rounded-full bg-[#151823] border border-white/10 overflow-hidden mx-auto mb-1.5">
                        {person.profile_path ? (
                          <img
                            src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                            alt={person.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[#A7A9B4]">
                            {person.name.slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <p className="text-xs font-bold text-white truncate">{person.name}</p>
                      <p className="text-[10px] text-[#A7A9B4] truncate">{person.character}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Personal Rating & Review Note */}
            <div className="bg-[#151823]/80 p-5 rounded-2xl border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-[#F7F7FA] uppercase tracking-wider">
                Sua Avaliação &amp; Anotação
              </h3>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                  <button
                    key={star}
                    onClick={() => setUserRatingInput(star)}
                    className="p-1 hover:scale-125 transition-transform"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        star <= userRatingInput ? 'text-amber-400 fill-current' : 'text-white/20'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-amber-400 ml-2">
                  {userRatingInput > 0 ? `${userRatingInput}/10` : 'Sem nota'}
                </span>
              </div>

              <textarea
                value={userNoteInput}
                onChange={(e) => setUserNoteInput(e.target.value)}
                placeholder="Escreva seus pensamentos ou impressões sobre o filme..."
                className="w-full bg-[#10121A] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-[#A7A9B4] focus:outline-none focus:border-[#8B5CF6] h-20 resize-none"
              />

              <button
                onClick={handleSaveNote}
                className="button-primary px-5 py-2.5 rounded-xl text-xs font-bold"
              >
                Salvar Avaliação
              </button>
            </div>

            <TitleCommunity media={media} userProfile={userProfile} />
          </div>
        </div>
      </div>

      <RecommendModal
        isOpen={recommendOpen}
        media={media}
        userProfile={userProfile}
        onClose={() => setRecommendOpen(false)}
        onSent={(count) => onAddToast?.('Recomendação enviada', `Enviado para ${count} destino${count > 1 ? 's' : ''}.`, 'success')}
      />
    </div>
  );
};
