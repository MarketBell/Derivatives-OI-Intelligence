import { OptionChainSnapshot, IOptionChainSnapshot } from '../models/OptionChainSnapshot';
import { SupportedIndex, NormalizedOptionChain } from '../types/optionChain';
import { validateNormalizedOptionChain } from '../validation/optionChainValidation';
import { isDatabaseConnected } from '../config/database';
import { Logger } from '../utils/logger';

export class SnapshotService {
  /**
   * Validate and save an option chain snapshot into MongoDB.
   */
  public async saveSnapshot(data: NormalizedOptionChain): Promise<IOptionChainSnapshot> {
    if (!isDatabaseConnected()) {
      throw new Error('Database is not connected. Cannot persist snapshot.');
    }

    // Step 1: Runtime validation
    const validatedData = validateNormalizedOptionChain(data);

    // Step 2: Upsert snapshot by (index, timestamp) to prevent duplicate records
    const timestampDate = new Date(validatedData.timestamp);

    const snapshot = await OptionChainSnapshot.findOneAndUpdate(
      {
        index: validatedData.index,
        timestamp: timestampDate
      },
      {
        index: validatedData.index,
        timestamp: timestampDate,
        dateStr: validatedData.dateStr,
        timeStr: validatedData.timeStr,
        expiry: validatedData.expiry,
        underlyingValue: validatedData.underlyingValue,
        totalCallOI: validatedData.totalCallOI,
        totalPutOI: validatedData.totalPutOI,
        strikes: validatedData.strikes
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );

    Logger.info('SnapshotService', `Persisted snapshot for ${validatedData.index} at ${validatedData.timeStr} (${validatedData.dateStr})`);
    return snapshot;
  }

  /**
   * Fetch stored snapshots for a specific index and date, sorted chronologically.
   */
  public async getSnapshotsByDate(index: SupportedIndex, dateStr: string): Promise<IOptionChainSnapshot[]> {
    if (!isDatabaseConnected()) {
      return [];
    }

    return OptionChainSnapshot.find({ index, dateStr }).sort({ timestamp: 1 }).exec();
  }

  /**
   * Fetch all distinct available dates recorded for an index.
   */
  public async getAvailableDates(index: SupportedIndex): Promise<string[]> {
    if (!isDatabaseConnected()) {
      return [];
    }

    const dates = await OptionChainSnapshot.distinct('dateStr', { index }).exec();
    return dates.sort().reverse(); // Recent dates first
  }

  /**
   * Fetch the single latest snapshot for a given index.
   */
  public async getLatestSnapshot(index: SupportedIndex): Promise<IOptionChainSnapshot | null> {
    if (!isDatabaseConnected()) {
      return null;
    }

    return OptionChainSnapshot.findOne({ index }).sort({ timestamp: -1 }).exec();
  }

  /**
   * Fetch the previous snapshot before a given timestamp (or the second most recent if omitted).
   */
  public async getPreviousSnapshot(
    index: SupportedIndex,
    beforeTimestamp?: Date | string
  ): Promise<IOptionChainSnapshot | null> {
    if (!isDatabaseConnected()) {
      return null;
    }

    const query: any = { index };
    if (beforeTimestamp) {
      const beforeDate = typeof beforeTimestamp === 'string' ? new Date(beforeTimestamp) : beforeTimestamp;
      query.timestamp = { $lt: beforeDate };
    }

    return OptionChainSnapshot.findOne(query).sort({ timestamp: -1 }).exec();
  }

  /**
   * Fetch snapshots within an arbitrary time range for an index.
   */
  public async getSnapshotsInRange(
    index: SupportedIndex,
    startDate: Date | string,
    endDate: Date | string
  ): Promise<IOptionChainSnapshot[]> {
    if (!isDatabaseConnected()) {
      return [];
    }

    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;

    return OptionChainSnapshot.find({
      index,
      timestamp: { $gte: start, $lte: end }
    }).sort({ timestamp: 1 }).exec();
  }

  /**
   * Delete snapshots by index and optional dateStr (useful for testing and reset)
   */
  public async clearSnapshots(index?: SupportedIndex, dateStr?: string): Promise<number> {
    if (!isDatabaseConnected()) return 0;
    const filter: any = {};
    if (index) filter.index = index;
    if (dateStr) filter.dateStr = dateStr;
    const res = await OptionChainSnapshot.deleteMany(filter);
    return res.deletedCount || 0;
  }
}

export const snapshotService = new SnapshotService();
