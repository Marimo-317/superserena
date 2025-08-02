/**
 * Advanced Cache System - 95% hit rate target
 * Multi-level caching with intelligent prefetching
 */

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccess: number;
  ttl: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  size: number;
  memoryUsage: number;
}

export class AdvancedCacheSystem<T> {
  private l1Cache = new Map<string, CacheEntry<T>>(); // Hot data
  private l2Cache = new Map<string, CacheEntry<T>>(); // Warm data
  private l3Cache = new Map<string, CacheEntry<T>>(); // Cold data
  
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    hitRate: 0,
    size: 0,
    memoryUsage: 0
  };

  private readonly maxL1Size = 100;
  private readonly maxL2Size = 500;
  private readonly maxL3Size = 1000;
  private readonly defaultTTL = 3600000; // 1 hour

  constructor(private name: string) {
    this.startMaintenance();
  }

  get(key: string): T | null {
    const now = Date.now();
    let entry = this.l1Cache.get(key);
    
    if (entry && now < entry.timestamp + entry.ttl) {
      entry.accessCount++;
      entry.lastAccess = now;
      this.stats.hits++;
      this.updateHitRate();
      return entry.value;
    }

    // Check L2
    entry = this.l2Cache.get(key);
    if (entry && now < entry.timestamp + entry.ttl) {
      entry.accessCount++;
      entry.lastAccess = now;
      this.promoteToL1(key, entry);
      this.stats.hits++;
      this.updateHitRate();
      return entry.value;
    }

    // Check L3
    entry = this.l3Cache.get(key);
    if (entry && now < entry.timestamp + entry.ttl) {
      entry.accessCount++;
      entry.lastAccess = now;
      this.promoteToL2(key, entry);
      this.stats.hits++;
      this.updateHitRate();
      return entry.value;
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  set(key: string, value: T, ttl: number = this.defaultTTL): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccess: Date.now(),
      ttl
    };

    // Always insert into L1 for hot data
    if (this.l1Cache.size >= this.maxL1Size) {
      this.evictFromL1();
    }
    
    this.l1Cache.set(key, entry);
    this.updateStats();
  }

  private promoteToL1(key: string, entry: CacheEntry<T>): void {
    this.l2Cache.delete(key);
    
    if (this.l1Cache.size >= this.maxL1Size) {
      this.evictFromL1();
    }
    
    this.l1Cache.set(key, entry);
  }

  private promoteToL2(key: string, entry: CacheEntry<T>): void {
    this.l3Cache.delete(key);
    
    if (this.l2Cache.size >= this.maxL2Size) {
      this.evictFromL2();
    }
    
    this.l2Cache.set(key, entry);
  }

  private evictFromL1(): void {
    const victim = this.findLRU(this.l1Cache);
    if (victim) {
      this.l1Cache.delete(victim);
      // Optionally demote to L2
      const entry = this.l1Cache.get(victim);
      if (entry && entry.accessCount > 1) {
        if (this.l2Cache.size < this.maxL2Size) {
          this.l2Cache.set(victim, entry);
        }
      }
      this.stats.evictions++;
    }
  }

  private evictFromL2(): void {
    const victim = this.findLRU(this.l2Cache);
    if (victim) {
      const entry = this.l2Cache.get(victim);
      this.l2Cache.delete(victim);
      
      // Demote to L3 if accessed multiple times
      if (entry && entry.accessCount > 2 && this.l3Cache.size < this.maxL3Size) {
        this.l3Cache.set(victim, entry);
      }
      this.stats.evictions++;
    }
  }

  private findLRU(cache: Map<string, CacheEntry<T>>): string | null {
    let oldest: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess;
        oldest = key;
      }
    }

    return oldest;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  private updateStats(): void {
    this.stats.size = this.l1Cache.size + this.l2Cache.size + this.l3Cache.size;
    this.updateHitRate();
  }

  private startMaintenance(): void {
    setInterval(() => {
      this.cleanupExpired();
      this.optimizeCache();
    }, 60000); // Every minute
  }

  private cleanupExpired(): void {
    const now = Date.now();
    
    [this.l1Cache, this.l2Cache, this.l3Cache].forEach(cache => {
      for (const [key, entry] of cache) {
        if (now > entry.timestamp + entry.ttl) {
          cache.delete(key);
        }
      }
    });
    
    this.updateStats();
  }

  private optimizeCache(): void {
    // Move frequently accessed L2 items to L1
    for (const [key, entry] of this.l2Cache) {
      if (entry.accessCount > 10 && this.l1Cache.size < this.maxL1Size) {
        this.l2Cache.delete(key);
        this.l1Cache.set(key, entry);
      }
    }
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  clear(): void {
    this.l1Cache.clear();
    this.l2Cache.clear();
    this.l3Cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      hitRate: 0,
      size: 0,
      memoryUsage: 0
    };
  }
}

// Moon Phase specific cache
export class MoonPhaseCache extends AdvancedCacheSystem<any> {
  constructor() {
    super("MoonPhaseCache");
  }

  getMoonPhase(date: Date): any | null {
    const key = this.generateDateKey(date);
    return this.get(key);
  }

  setMoonPhase(date: Date, moonPhase: any): void {
    const key = this.generateDateKey(date);
    this.set(key, moonPhase, 3600000); // 1 hour TTL
  }

  private generateDateKey(date: Date): string {
    // Round to nearest minute for cache efficiency
    const roundedTime = Math.floor(date.getTime() / 60000) * 60000;
    return `moon_${roundedTime}`;
  }

  prefetchRange(startDate: Date, endDate: Date): string[] {
    const keys: string[] = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      keys.push(this.generateDateKey(current));
      current.setHours(current.getHours() + 1); // Hourly intervals
    }
    
    return keys;
  }
}

export const moonPhaseCache = new MoonPhaseCache();
