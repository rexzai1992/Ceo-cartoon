import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, RefreshCw, AlertCircle, MapPin, Maximize2, RotateCcw, Download } from 'lucide-react';
import { supabase } from '../services/dbService';
import { getBeforeImageForGeneration } from '../services/presentationStorage';
import { Outlet, Generation } from '../types';

interface GalleryDashboardProps {
  onBack: () => void;
  onRegenerate?: (gen: Generation) => void;
}

const GALLERY_CACHE_PREFIX = 'gallery_cache_';
const MAX_CACHED_ITEMS = 24;
const IMAGE_LOAD_BATCH_SIZE = 3;
const GALLERY_THUMB_WIDTH = 420;
const GALLERY_THUMB_QUALITY = 70;

const DEMO_GENERATION: Generation = {
  id: 'demo-123',
  created_at: new Date().toISOString(),
  person_name: 'Ali',
  gender: 'Boy',
  business_name: 'Ali Tech Hub',
  business_type: 'Gaming Lounge',
  image_url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=800&auto=format&fit=crop',
  status: 'success',
  outlet: 'Melaka'
};

const isQuotaExceededError = (error: unknown): boolean => {
  if (!(error instanceof DOMException)) return false;
  return error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED';
};

const getGalleryCacheKey = (outlet: Outlet | 'All'): string => `${GALLERY_CACHE_PREFIX}${outlet}`;

const clearAllGalleryCaches = () => {
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(GALLERY_CACHE_PREFIX)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => localStorage.removeItem(key));
};

const buildCachePayload = (items: Generation[]): Generation[] => {
  return items
    .map((item) => {
      const beforeImageUrl = item.before_image_url || '';
      if (beforeImageUrl.startsWith('data:image/')) {
        return { ...item, before_image_url: '' };
      }
      return item;
    })
    .filter((item) => {
      const imageUrl = item.image_url || '';
      return item.id === DEMO_GENERATION.id || !imageUrl.startsWith('data:image/');
    })
    .slice(0, MAX_CACHED_ITEMS);
};

const buildGalleryThumbnailUrl = (src: string): string => {
  if (!src) return src;
  if (src.startsWith('data:') || src.startsWith('blob:') || src.startsWith('/')) return src;

  try {
    const url = new URL(src);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return src;
    }

    // Supabase Storage public object URL -> render/image transform URL
    if (url.pathname.includes('/storage/v1/object/public/')) {
      url.pathname = url.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
      url.searchParams.set('width', String(GALLERY_THUMB_WIDTH));
      url.searchParams.set('quality', String(GALLERY_THUMB_QUALITY));
      url.searchParams.set('format', 'webp');
      return url.toString();
    }

    // Supabase signed URL -> render/image/sign transform URL
    if (url.pathname.includes('/storage/v1/object/sign/')) {
      url.pathname = url.pathname.replace('/storage/v1/object/sign/', '/storage/v1/render/image/sign/');
      url.searchParams.set('width', String(GALLERY_THUMB_WIDTH));
      url.searchParams.set('quality', String(GALLERY_THUMB_QUALITY));
      url.searchParams.set('format', 'webp');
      return url.toString();
    }

    // Only apply generic query transforms for known hosts.
    if (url.hostname.includes('unsplash.com')) {
      url.searchParams.set('w', String(GALLERY_THUMB_WIDTH));
      url.searchParams.set('q', String(GALLERY_THUMB_QUALITY));
      url.searchParams.set('auto', 'format');
      return url.toString();
    }

    return src;
  } catch {
    return src;
  }
};

const writeGalleryCache = (outlet: Outlet | 'All', items: Generation[]) => {
  const cacheKey = getGalleryCacheKey(outlet);
  const payload = buildCachePayload(items);

  if (payload.length === 0) {
    localStorage.removeItem(cacheKey);
    return;
  }

  const serialized = JSON.stringify(payload);

  try {
    localStorage.setItem(cacheKey, serialized);
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      console.warn('Failed to write gallery cache:', error);
      return;
    }

    // Clear old gallery caches and retry once with the smaller sanitized payload.
    try {
      clearAllGalleryCaches();
      localStorage.setItem(cacheKey, serialized);
    } catch (retryError) {
      console.warn('Gallery cache skipped due to storage limits:', retryError);
    }
  }
};

const GalleryDashboard: React.FC<GalleryDashboardProps> = ({ onBack, onRegenerate }) => {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | 'All'>('All');
  const [limit, setLimit] = useState(12);
  const [hasMore, setHasMore] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadPreview, setDownloadPreview] = useState<{ url: string; filename: string } | null>(null);
  const [imageLoadingIds, setImageLoadingIds] = useState<Record<string, boolean>>({});
  const [thumbnailFallbackIds, setThumbnailFallbackIds] = useState<Record<string, boolean>>({});
  const [beforeAfterModeById, setBeforeAfterModeById] = useState<Record<string, 'before' | 'after'>>({});
  const [activePresentedId, setActivePresentedId] = useState<string | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const presentRequestSeqRef = useRef(0);

  // Optimized query to only fetch pending items for status updates
  const updatePendingGenerations = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('generations')
        .select('id,status,created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const now = new Date().getTime();
      const updates: Record<string, string> = {};

      // Check for timeouts and collect pending items data
      (data || []).forEach(item => {
        const genTime = new Date(item.created_at).getTime();
        if (now - genTime > 2 * 60 * 1000) {
          updates[item.id] = 'error';
        }
      });

      // Apply local updates to generations
      setGenerations(prev => prev.map(gen => ({
        ...gen,
        status: updates[gen.id] || gen.status
      })));

      // Update any timed-out items in database
      if (Object.keys(updates).length > 0) {
        const timedOut = Object.entries(updates).filter(([_, status]) => status === 'error');
        for (const [id, _] of timedOut) {
          supabase.from('generations').update({ status: 'error' }).eq('id', id).then();
        }
      }
    } catch (err) {
      console.error('Error updating pending items:', err);
    }
  };

  const fetchGenerations = async (isPolling = false, currentLimit = limit) => {
    if (!supabase) {
      if (!isPolling) {
        setError('Supabase is not configured. Please add your credentials in Settings.');
        setLoading(false);
      }
      return;
    }

    if (!isPolling) {
      if (generations.length === 0) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
    }
    setError(null);
    try {
      let query = supabase
        .from('generations')
        .select('id,created_at,person_name,gender,business_name,business_type,status,outlet,before_image_url')
        .order('created_at', { ascending: false })
        .limit(currentLimit + 1);

      if (selectedOutlet !== 'All') {
        query = query.eq('outlet', selectedOutlet);
      }

      const { data, error } = await query;

      if (error) throw error;

      const fetchedData = (data || []).map((item: any) => ({
        ...item,
        image_url: '',
        before_image_url: item.before_image_url || '',
      })) as Generation[];
      const hasNextPage = fetchedData.length > currentLimit;
      const pagedData = hasNextPage ? fetchedData.slice(0, currentLimit) : fetchedData;

      setHasMore(hasNextPage);
      
      const displayData = (selectedOutlet === 'All' || selectedOutlet === DEMO_GENERATION.outlet) 
        ? [DEMO_GENERATION, ...pagedData] 
        : pagedData;
        
      setGenerations(displayData);
      const idsToLoad = displayData
        .filter((item) => item.status === 'success' && item.id !== DEMO_GENERATION.id && !item.image_url)
        .map((item) => item.id);
      if (idsToLoad.length > 0) {
        void loadGenerationImagesByIds(idsToLoad);
      }
      if (!isPolling) {
        writeGalleryCache(selectedOutlet, displayData);
      }
    } catch (err) {
      console.error('Error fetching gallery:', err);
      if (!isPolling) setError(err instanceof Error ? err.message : 'Failed to load gallery');
    } finally {
      if (!isPolling) {
        setLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  useEffect(() => {
    setBeforeAfterModeById({});
    setThumbnailFallbackIds({});
    setLimit(12);
    const cacheKey = getGalleryCacheKey(selectedOutlet);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsedRaw = JSON.parse(cached) as Generation[];
        const parsed = (parsedRaw || []).map((item) => ({
          ...item,
          image_url: item.image_url || '',
          before_image_url: item.before_image_url || '',
        })) as Generation[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setGenerations(parsed);
          setLoading(false);
          const idsToLoad = parsed
            .filter((item) => item.status === 'success' && item.id !== DEMO_GENERATION.id && !item.image_url)
            .map((item) => item.id);
          if (idsToLoad.length > 0) {
            void loadGenerationImagesByIds(idsToLoad);
          }
        }
      } catch {
        // Ignore malformed cache and refetch from DB.
      }
    }
    fetchGenerations(false, 12);
  }, [selectedOutlet]);

  const mergeGenerationImages = (rows: Array<{ id: string; image_url?: string; before_image_url?: string }>) => {
    if (rows.length === 0) return;
    const byId = new Map(rows.map((row) => [row.id, row]));

    setGenerations((prev) =>
      prev.map((item) => {
        const row = byId.get(item.id);
        if (!row) return item;

        return {
          ...item,
          image_url: row.image_url || item.image_url,
          before_image_url: row.before_image_url || item.before_image_url,
        };
      })
    );

    setImageLoadingIds((prev) => {
      const next = { ...prev };
      rows.forEach((row) => {
        delete next[row.id];
      });
      return next;
    });
  };

  const loadGenerationImagesByIds = async (ids: string[]) => {
    if (!supabase || ids.length === 0) return;

    setImageLoadingIds((prev) => {
      const next = { ...prev };
      ids.forEach((id) => {
        next[id] = true;
      });
      return next;
    });

    for (let i = 0; i < ids.length; i += IMAGE_LOAD_BATCH_SIZE) {
      const batch = ids.slice(i, i + IMAGE_LOAD_BATCH_SIZE);
      try {
        const { data, error } = await supabase
          .from('generations')
          .select('id,image_url,before_image_url')
          .in('id', batch);

        if (error) throw error;

        const rows = (data || []).filter(
          (row: any) =>
            (typeof row.image_url === 'string' && row.image_url.length > 0) ||
            (typeof row.before_image_url === 'string' && row.before_image_url.length > 0)
        ) as Array<{ id: string; image_url?: string; before_image_url?: string }>;
        mergeGenerationImages(rows);
      } catch (err) {
        console.error('Error loading gallery images batch:', err);
        setImageLoadingIds((prev) => {
          const next = { ...prev };
          batch.forEach((id) => {
            delete next[id];
          });
          return next;
        });
      }
    }
  };

  const ensureGenerationImage = async (gen: Generation): Promise<Generation | null> => {
    if (gen.image_url || gen.id === DEMO_GENERATION.id) {
      return gen;
    }
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('generations')
        .select('id,image_url,before_image_url')
        .eq('id', gen.id)
        .single();

      if (error) throw error;
      if (!data?.image_url) return null;

      const hydrated: Generation = {
        ...gen,
        image_url: data.image_url,
        before_image_url: data.before_image_url || gen.before_image_url,
      };
      setGenerations((prev) => prev.map((item) => (item.id === gen.id ? hydrated : item)));
      setImageLoadingIds((prev) => {
        const next = { ...prev };
        delete next[gen.id];
        return next;
      });
      return hydrated;
    } catch (err) {
      console.error('Error loading generation image:', err);
      return null;
    }
  };

  // Optimized polling effect - only check pending items
  useEffect(() => {
    // Clear existing timeout
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }

    const hasPending = generations.some(gen => gen.status === 'pending');
    if (!hasPending) return;

    // Poll every 8 seconds instead of 3 for pending items only
    pollingTimeoutRef.current = setTimeout(() => {
      updatePendingGenerations();
    }, 8000);

    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
    };
  }, [generations]);

  const handleLoadMore = () => {
    const newLimit = limit + 12;
    setLimit(newLimit);
    fetchGenerations(false, newLimit);
  };

  const handlePresent = async (gen: Generation) => {
    const requestSeq = ++presentRequestSeqRef.current;
    const genWithImage = await ensureGenerationImage(gen);
    if (requestSeq !== presentRequestSeqRef.current) return;
    if (!genWithImage || !genWithImage.image_url) {
      alert('Image is still loading. Please try again in a moment.');
      return;
    }

    const beforeImage = getBeforeImageForGeneration(genWithImage.id);
    const presentationPayload: Generation = beforeImage
      ? { ...genWithImage, before_image_url: beforeImage }
      : genWithImage;

    localStorage.setItem(
      'presentation_data',
      JSON.stringify({ ...presentationPayload, presented_at: Date.now() })
    );
    setActivePresentedId(gen.id);
  };

  const handleDownload = async (gen: Generation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloadingId) return;
    setDownloadingId(gen.id);
    
    try {
      const genWithImage = await ensureGenerationImage(gen);
      if (!genWithImage || !genWithImage.image_url) {
        alert('Image is still loading. Please try again in a moment.');
        return;
      }

      const canvas = document.createElement('canvas');
      // 4x6 at 300 DPI = 1200 x 1800
      canvas.width = 1200;
      canvas.height = 1800;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const CORS_PROXY_PREFIX = 'https://corsproxy.io/?';
      const toProxyUrl = (src: string) => `${CORS_PROXY_PREFIX}${encodeURIComponent(src)}`;
      const isHttpUrl = (src: string) => /^https?:\/\//i.test(src);

      const loadImageOnce = (src: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
          const img = new Image();
          if (!src.startsWith('data:') && !src.startsWith('blob:') && !src.startsWith('/')) {
            img.crossOrigin = 'anonymous';
          }
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });

      const loadImage = async (src: string): Promise<HTMLImageElement> => {
        try {
          return await loadImageOnce(src);
        } catch {
          if (isHttpUrl(src) && !src.startsWith(CORS_PROXY_PREFIX)) {
            return loadImageOnce(toProxyUrl(src));
          }
          throw new Error(`Failed to load image source: ${src}`);
        }
      };

      const drawImageCover = (
        image: HTMLImageElement,
        x: number,
        y: number,
        width: number,
        height: number
      ) => {
        const imageRatio = image.width / image.height;
        const targetRatio = width / height;

        let sx = 0;
        let sy = 0;
        let sWidth = image.width;
        let sHeight = image.height;

        if (imageRatio > targetRatio) {
          sWidth = image.height * targetRatio;
          sx = (image.width - sWidth) / 2;
        } else {
          sHeight = image.width / targetRatio;
          sy = (image.height - sHeight) / 2;
        }

        ctx.drawImage(image, sx, sy, sWidth, sHeight, x, y, width, height);
      };

      const drawImageContain = (
        image: HTMLImageElement,
        x: number,
        y: number,
        width: number,
        height: number
      ) => {
        const imageRatio = image.width / image.height;
        const boxRatio = width / height;

        let drawWidth = width;
        let drawHeight = height;

        if (imageRatio > boxRatio) {
          drawHeight = width / imageRatio;
        } else {
          drawWidth = height * imageRatio;
        }

        const drawX = x + (width - drawWidth) / 2;
        const drawY = y + (height - drawHeight) / 2;
        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      };

      const drawImageContainTrimAlpha = (
        image: HTMLImageElement,
        x: number,
        y: number,
        width: number,
        height: number
      ) => {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = image.width;
        tempCanvas.height = image.height;
        const tempCtx = tempCanvas.getContext('2d');

        if (!tempCtx) {
          drawImageContain(image, x, y, width, height);
          return;
        }

        tempCtx.drawImage(image, 0, 0);

        let minX = image.width;
        let minY = image.height;
        let maxX = -1;
        let maxY = -1;

        try {
          const { data } = tempCtx.getImageData(0, 0, image.width, image.height);
          for (let py = 0; py < image.height; py++) {
            for (let px = 0; px < image.width; px++) {
              const alpha = data[(py * image.width + px) * 4 + 3];
              if (alpha > 10) {
                if (px < minX) minX = px;
                if (py < minY) minY = py;
                if (px > maxX) maxX = px;
                if (py > maxY) maxY = py;
              }
            }
          }
        } catch {
          drawImageContain(image, x, y, width, height);
          return;
        }

        if (maxX < minX || maxY < minY) {
          drawImageContain(image, x, y, width, height);
          return;
        }

        const sourceW = maxX - minX + 1;
        const sourceH = maxY - minY + 1;
        const sourceRatio = sourceW / sourceH;
        const targetRatio = width / height;

        let drawWidth = width;
        let drawHeight = height;
        if (sourceRatio > targetRatio) {
          drawHeight = width / sourceRatio;
        } else {
          drawWidth = height * sourceRatio;
        }

        const drawX = x + (width - drawWidth) / 2;
        const drawY = y + (height - drawHeight) / 2;
        ctx.drawImage(image, minX, minY, sourceW, sourceH, drawX, drawY, drawWidth, drawHeight);
      };

      const drawFittedCenteredText = (
        text: string,
        y: number,
        maxWidth: number,
        weight: number,
        startSize: number,
        minSize: number,
        color: string
      ) => {
        let fontSize = startSize;
        ctx.fillStyle = color;
        while (fontSize >= minSize) {
          ctx.font = `${weight} ${fontSize}px sans-serif`;
          if (ctx.measureText(text).width <= maxWidth) break;
          fontSize -= 2;
        }
        ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, y);
      };

      const drawWrappedCenteredText = (
        text: string,
        centerX: number,
        startY: number,
        maxWidth: number,
        lineHeight: number,
        weight: number,
        size: number,
        color: string,
        maxLines = 4
      ): number => {
        ctx.fillStyle = color;
        ctx.font = `${weight} ${size}px sans-serif`;
        ctx.textAlign = 'center';

        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';

        for (const word of words) {
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          if (ctx.measureText(testLine).width <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) lines.push(currentLine);
            currentLine = word;
          }
        }
        if (currentLine) lines.push(currentLine);

        const visibleLines = lines.slice(0, maxLines);
        visibleLines.forEach((line, index) => {
          ctx.fillText(line, centerX, startY + index * lineHeight);
        });

        return startY + visibleLines.length * lineHeight;
      };

      const drawRoundedRect = (
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
      ) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
      };

      const qrTargetUrl = 'https://aig.aigenius.com.my/';
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&format=png&margin=12&ecc=H&color=111827&bgcolor=ffffff&data=${encodeURIComponent(qrTargetUrl)}`;

      // Load images
      const [mainImg, logoImg, wonderparkLogoImg, qrImg] = await Promise.all([
        loadImage(genWithImage.image_url),
        loadImage('/logos/aigenius-logo.png').catch(() => null),
        loadImage('/logos/wonderpark-logo.png').catch(() => null),
        loadImage(qrImageUrl).catch(() => null)
      ]);

      // Outer print border
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 6;
      ctx.strokeRect(20, 20, 1160, 1760);

      // Photo white frame with subtle shadow
      const frameX = 100;
      const frameY = 90;
      const frameSize = 1000;
      const photoPadding = 26;
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(17, 24, 39, 0.18)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 10;
      ctx.fillRect(frameX, frameY, frameSize, frameSize);
      ctx.restore();
      drawImageCover(
        mainImg,
        frameX + photoPadding,
        frameY + photoPadding,
        frameSize - photoPadding * 2,
        frameSize - photoPadding * 2
      );

      // Name + Shop
      drawFittedCenteredText(gen.person_name || 'Kid CEO', 1210, 980, 800, 74, 46, '#111827');
      const shopName = gen.business_name && gen.business_name !== 'N/A' ? gen.business_name : 'My Shop';
      drawFittedCenteredText(shopName, 1290, 980, 600, 52, 34, '#4B5563');

      // Bottom info panel
      const panelX = 90;
      const panelY = 1365;
      const panelW = 1020;
      const panelH = 360;
      ctx.fillStyle = '#F9FAFB';
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 3;
      ctx.strokeRect(panelX, panelY, panelW, panelH);

      // QR section layout (right)
      const qrBoxSize = 204;
      const qrX = panelX + panelW - qrBoxSize - 52;
      const qrY = panelY + 84;

      // Draw logos side-by-side (left block)
      const logosX = panelX + 44;
      const logosY = panelY + 98;
      const logosAreaW = qrX - logosX - 40;
      const logoGap = 32;
      const logoSlotW = (logosAreaW - logoGap) / 2;
      const logoSlotH = 126;
      const aiSlotX = logosX;
      const wpSlotX = logosX + logoSlotW + logoGap;

      ctx.beginPath();
      ctx.moveTo(qrX - 26, panelY + 40);
      ctx.lineTo(qrX - 26, panelY + panelH - 40);
      ctx.strokeStyle = '#E5E7EB';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (logoImg) {
        drawImageContainTrimAlpha(logoImg, aiSlotX, logosY, logoSlotW, logoSlotH);
      } else {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 44px sans-serif';
        ctx.fillText('AI Genius', aiSlotX + logoSlotW / 2, logosY + 86);
      }

      // Wonderpark logo beside AI Genius
      if (wonderparkLogoImg) {
        drawImageContain(wonderparkLogoImg, wpSlotX, logosY, logoSlotW, logoSlotH);
      } else {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#111827';
        ctx.font = '900 44px sans-serif';
        ctx.fillText('WONDERPARK', wpSlotX + logoSlotW / 2, logosY + 86);
      }

      drawWrappedCenteredText(
        'Experience AI Entrepreneurship',
        qrX + qrBoxSize / 2,
        panelY + 46,
        qrBoxSize + 24,
        22,
        700,
        19,
        '#111827',
        2
      );

      if (qrImg) {
        ctx.drawImage(qrImg, qrX, qrY, qrBoxSize, qrBoxSize);
      } else {
        ctx.fillStyle = '#F3F4F6';
        ctx.fillRect(qrX, qrY, qrBoxSize, qrBoxSize);
        ctx.strokeStyle = '#9CA3AF';
        ctx.strokeRect(qrX, qrY, qrBoxSize, qrBoxSize);
        ctx.fillStyle = '#374151';
        ctx.font = '600 20px sans-serif';
        ctx.fillText('QR', qrX + qrBoxSize / 2, qrY + qrBoxSize / 2 + 8);
      }

      ctx.fillStyle = '#6B7280';
      ctx.font = '500 17px sans-serif';
      ctx.fillText(qrTargetUrl, qrX + qrBoxSize / 2, panelY + panelH - 22);

      let dataUrl = '';
      try {
        dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      } catch (exportError) {
        console.error('Canvas export failed:', exportError);
        throw new Error('Canvas export failed');
      }
      const filename = `${gen.person_name}_Wonderpark.jpg`;
      setDownloadPreview({ url: dataUrl, filename });
    } catch (err) {
      console.error('Error generating download image:', err);
      alert('Failed to prepare download image. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConfirmDownload = () => {
    if (!downloadPreview) return;
    const link = document.createElement('a');
    link.download = downloadPreview.filename;
    link.href = downloadPreview.url;
    link.click();
    setDownloadPreview(null);
  };

  const formatElapsed = (totalSeconds: number): string => {
    const safeSeconds = Math.max(0, totalSeconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getElapsedSeconds = (createdAt: string): number => {
    const createdAtMs = new Date(createdAt).getTime();
    if (!Number.isFinite(createdAtMs)) return 0;
    return Math.floor((nowMs - createdAtMs) / 1000);
  };

  useEffect(() => {
    const hasPending = generations.some((gen) => gen.status === 'pending');
    if (!hasPending) return;

    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [generations]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            Back to App
          </button>
          <h1 className="text-xl font-bold text-gray-900">Generated Gallery</h1>
          <button 
            onClick={() => fetchGenerations(false, limit)}
            disabled={loading || isRefreshing}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh Gallery"
          >
            <RefreshCw size={20} className={loading || isRefreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Outlet Filter */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex bg-gray-100 p-1 rounded-xl">
            {(['All', 'Melaka', 'Kuala Terengganu'] as const).map((o) => (
              <button
                key={o}
                onClick={() => setSelectedOutlet(o)}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  selectedOutlet === o 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {o === 'All' ? 'All Outlets' : o}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw size={40} className="animate-spin text-blue-500 mb-4" />
            <p className="text-gray-500 font-medium">Loading gallery...</p>
          </div>
        ) : generations.length === 0 && !error ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="text-6xl mb-4">🖼️</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No generations yet</h2>
            <p className="text-gray-500">Go back and generate your first CEO cartoon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {generations.map((gen) => (
              <div key={gen.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="aspect-square bg-gray-100 relative group overflow-hidden">
                  {gen.status === 'success' ? (
                    gen.image_url ? (
                      (() => {
                        const beforeImageUrl =
                          gen.before_image_url ||
                          (gen.id === DEMO_GENERATION.id ? null : getBeforeImageForGeneration(gen.id));
                        const hasBeforeImage = Boolean(beforeImageUrl);
                        const isBefore = hasBeforeImage && beforeAfterModeById[gen.id] === 'before';
                        const displayImageSrc = isBefore
                          ? (beforeImageUrl as string)
                          : (thumbnailFallbackIds[gen.id] ? gen.image_url : buildGalleryThumbnailUrl(gen.image_url));

                        return (
                      <>
                        <div className="absolute top-2 left-2 z-20 inline-flex bg-white/90 backdrop-blur-sm rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                          <button
                            onClick={() => setBeforeAfterModeById((prev) => ({ ...prev, [gen.id]: 'before' }))}
                            disabled={!hasBeforeImage}
                            className={`px-2.5 py-1.5 text-xs font-bold transition-colors ${
                              isBefore
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            Before
                          </button>
                          <button
                            onClick={() => setBeforeAfterModeById((prev) => ({ ...prev, [gen.id]: 'after' }))}
                            className={`px-2.5 py-1.5 text-xs font-bold transition-colors ${
                              !isBefore
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            After
                          </button>
                        </div>
                        <img 
                          src={displayImageSrc}
                          alt={gen.person_name} 
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          decoding="async"
                          onError={() => {
                            if (isBefore) return;
                            setThumbnailFallbackIds((prev) => {
                              if (prev[gen.id]) return prev;
                              return { ...prev, [gen.id]: true };
                            });
                          }}
                        />
                        <div className="absolute inset-0 z-10 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <button
                            onClick={() => void handlePresent(gen)}
                            className="bg-white/90 text-gray-900 p-3 rounded-full hover:bg-white hover:scale-110 transition-all shadow-lg"
                            title="Presentation Mode"
                          >
                            <Maximize2 size={24} />
                          </button>
                          <button
                            onClick={(e) => void handleDownload(gen, e)}
                            disabled={downloadingId === gen.id}
                            className="bg-white/90 text-gray-900 p-3 rounded-full hover:bg-white hover:scale-110 transition-all shadow-lg disabled:opacity-50"
                            title="Download 4x6 Photo"
                          >
                            {downloadingId === gen.id ? <RefreshCw size={24} className="animate-spin" /> : <Download size={24} />}
                          </button>
                        </div>
                      </>
                        );
                      })()
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 p-4 text-center">
                        <RefreshCw size={32} className={`mb-2 text-blue-400 ${imageLoadingIds[gen.id] ? 'animate-spin' : ''}`} />
                        <span className="text-sm font-medium">Loading image...</span>
                      </div>
                    )
                  ) : gen.status === 'error' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center text-red-400 bg-red-50 p-4 text-center">
                      <AlertCircle size={32} className="mb-2" />
                      <span className="text-sm font-medium mb-3">Generation Failed</span>
                      {onRegenerate && (
                        <button 
                          onClick={() => onRegenerate(gen)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm"
                        >
                          <RotateCcw size={14} />
                          Regenerate
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                      <RefreshCw size={32} className="animate-spin mb-2 text-blue-400" />
                      <span className="text-sm font-medium">Generating...</span>
                      <span className="text-xs font-semibold text-gray-500 mt-2">
                        Elapsed: {formatElapsed(getElapsedSeconds(gen.created_at))}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-gray-900 text-lg truncate">{gen.person_name}</h3>
                  <div className="text-sm text-gray-500 mt-1 space-y-1 flex-1">
                    <p className="truncate"><span className="font-medium">Business:</span> {gen.business_name}</p>
                    <p className="truncate"><span className="font-medium">Type:</span> {gen.business_type}</p>
                  </div>
                  {gen.status === 'success' && gen.image_url && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => void handlePresent(gen)}
                        className={`inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-sm font-semibold transition-colors ${
                          activePresentedId === gen.id
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-red-600 hover:bg-red-700'
                        }`}
                      >
                        <Maximize2 size={16} />
                        {activePresentedId === gen.id ? 'Presented' : 'Present'}
                      </button>
                      <button
                        onClick={(e) => void handleDownload(gen, e)}
                        disabled={downloadingId === gen.id}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                      >
                        {downloadingId === gen.id ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                        Download
                      </button>
                    </div>
                  )}
                  <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 flex justify-between items-center">
                    <span>{new Date(gen.created_at).toLocaleDateString()}</span>
                    <span className={`px-2 py-1 rounded-full font-medium ${
                      gen.status === 'success' ? 'bg-green-100 text-green-700' : 
                      gen.status === 'error' ? 'bg-red-100 text-red-700' : 
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {gen.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {hasMore && !loading && generations.length > 0 && (
          <div className="mt-12 mb-8 flex justify-center">
            <button
              onClick={handleLoadMore}
              className="px-8 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl shadow-sm hover:bg-gray-50 hover:shadow transition-all"
            >
              Load More
            </button>
          </div>
        )}
      </main>

      {/* Download Preview Modal */}
      {downloadPreview && (
        <div
          className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDownloadPreview(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-3">Preview 4x6 Download</h3>
            <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50 mb-4">
              <img
                src={downloadPreview.url}
                alt="4x6 Download Preview"
                className="w-full h-auto object-contain"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDownloadPreview(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDownload}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Download Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryDashboard;
