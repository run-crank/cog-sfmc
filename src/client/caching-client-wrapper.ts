import { ClientWrapper } from './client-wrapper';
import { promisify } from 'util';
import * as grpc from '@grpc/grpc-js';
import { ContactAwareMixin, JourneyAwareMixin, ListAwareMixin } from './mixins';

class CachingClientWrapper {
  // cachePrefix is scoped to the specific scenario, request, and requestor
  public cachePrefix = `${this.idMap.scenarioId}${this.idMap.requestorId}${this.idMap.connectionId}`;

  constructor(private client: ClientWrapper, public redisClient: any, public idMap: any) {
    this.redisClient = redisClient;
    this.idMap = idMap;
  }

  // Contact aware methods
  // -------------------------------------------------------------------

  public async getContactByEmail(email: string) {
    const cachekey = `SFMC|Contact|Email|${email}|${this.cachePrefix}`;
    const stored = await this.getCache(cachekey);
    if (stored) {
      return stored;
    }

    const result = await this.client.getContactByEmail(email);
    if (result) {
      await this.setCache(cachekey, result);
    }
    return result;
  }

  public async getContactByKey(contactKey: string) {
    const cachekey = `SFMC|Contact|Key|${contactKey}|${this.cachePrefix}`;
    const stored = await this.getCache(cachekey);
    if (stored) {
      return stored;
    }

    const result = await this.client.getContactByKey(contactKey);
    if (result) {
      await this.setCache(cachekey, result);
    }
    return result;
  }

  public async getContact(contactKey: string) {
    const cachekey = `SFMC|Contact|${contactKey}|${this.cachePrefix}`;
    const stored = await this.getCache(cachekey);
    if (stored) {
      return stored;
    }

    const result = await this.client.getContact(contactKey);
    if (result) {
      await this.setCache(cachekey, result);
    }
    return result;
  }

  public async createContact(contact: any) {
    await this.clearCache();
    return await this.client.createContact(contact);
  }

  public async updateContact(contactKey: string, contact: any) {
    await this.clearCache();
    return await this.client.updateContact(contactKey, contact);
  }

  public async deleteContact(contactKey: string) {
    await this.clearCache();
    return await this.client.deleteContact(contactKey);
  }

  // Redis methods for get, set, and delete
  // -------------------------------------------------------------------

  // Async getter/setter
  public getAsync = promisify(this.redisClient.get).bind(this.redisClient);
  public setAsync = promisify(this.redisClient.setex).bind(this.redisClient);
  public delAsync = promisify(this.redisClient.del).bind(this.redisClient);

  public async getCache(key: string) {
    try {
      const stored = await this.getAsync(key);
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    } catch (err) {
      console.log(err);
    }
  }

  public async setCache(key: string, value: any) {
    try {
      // arrOfKeys will store an array of all cache keys used in this scenario run
      // so it can be cleared easily
      const arrOfKeys = await this.getCache(`cachekeys|${this.cachePrefix}`) || [];
      arrOfKeys.push(key);
      await this.setAsync(key, 55, JSON.stringify(value));
      await this.setAsync(`cachekeys|${this.cachePrefix}`, 55, JSON.stringify(arrOfKeys));
    } catch (err) {
      console.log(err);
    }
  }

  public async delCache(key: string) {
    try {
      await this.delAsync(key);
    } catch (err) {
      console.log(err);
    }
  }

  public async clearCache() {
    try {
      // clears all the cachekeys used in this scenario run
      const keysToDelete = await this.getCache(`cachekeys|${this.cachePrefix}`) || [];
      if (keysToDelete.length) {
        keysToDelete.forEach(async (key: string) => await this.delAsync(key));
      }
      await this.setAsync(`cachekeys|${this.cachePrefix}`, 55, '[]');
    } catch (err) {
      console.log(err);
    }
  }

  // Add journey-related methods with caching

  public async getJourneyById(journeyId: string, extras: string = ''): Promise<Record<string, any>> {
    const cachekey = `SFMC|Journey|Id|${journeyId}|${this.cachePrefix}`;
    const stored = await this.getCache(cachekey);
    if (stored) {
      return stored;
    }

    const result = await this.client.getJourneyById(journeyId, extras);
    if (result) {
      await this.setCache(cachekey, result);
    }
    return result;
  }

  public async getJourneyByKey(journeyKey: string, extras: string = ''): Promise<Record<string, any>> {
    const cachekey = `SFMC|Journey|Key|${journeyKey}|${this.cachePrefix}`;
    const stored = await this.getCache(cachekey);
    if (stored) {
      return stored;
    }

    const result = await this.client.getJourneyByKey(journeyKey, extras);
    if (result) {
      await this.setCache(cachekey, result);
    }
    return result;
  }

  public async createJourney(journeyDefinition: Record<string, any>): Promise<Record<string, any>> {
    await this.clearCache();
    return await this.client.createJourney(journeyDefinition);
  }

  public async updateJourney(journeyId: string, journeyDefinition: Record<string, any>): Promise<Record<string, any>> {
    await this.clearCache();
    return await this.client.updateJourney(journeyId, journeyDefinition);
  }

  public async deleteJourney(journeyId: string): Promise<boolean> {
    await this.clearCache();
    return await this.client.deleteJourney(journeyId);
  }

  public async activateJourney(journeyId: string): Promise<Record<string, any>> {
    await this.clearCache();
    return await this.client.activateJourney(journeyId);
  }

  public async getJourneyStatus(journeyId: string): Promise<string> {
    return await this.client.getJourneyStatus(journeyId);
  }

  public async addContactToJourney(journeyKey: string, contactKey: string, data: Record<string, any> = {}): Promise<Record<string, any>> {
    await this.clearCache();
    return await this.client.addContactToJourney(journeyKey, contactKey, data);
  }

  public async isContactInJourney(contactKey: string, journeyId?: string): Promise<boolean> {
    return await this.client.isContactInJourney(contactKey, journeyId);
  }

  // --------------------------------
  // List-related caching methods
  // --------------------------------

  public async getListById(listId: string): Promise<Record<string, any>> {
    const cachekey = `SFMC|List|Id|${listId}|${this.cachePrefix}`;
    const stored = await this.getCache(cachekey);
    if (stored) {
      return stored;
    }

    const result = await this.client.getListById(listId);
    if (result) {
      await this.setCache(cachekey, result);
    }
    return result;
  }

  public async getListByName(listName: string): Promise<Record<string, any>> {
    const cachekey = `SFMC|List|Name|${listName}|${this.cachePrefix}`;
    const stored = await this.getCache(cachekey);
    if (stored) {
      return stored;
    }

    const result = await this.client.getListByName(listName);
    if (result) {
      await this.setCache(cachekey, result);
    }
    return result;
  }

  public async getAllLists(filters: Record<string, any> = {}): Promise<Record<string, any>[]> {
    // Create a cache key that includes the filter keys and values
    const filterString = Object.keys(filters)
      .sort()
      .map(key => `${key}=${filters[key]}`)
      .join('|');

    const cachekey = `SFMC|Lists|${filterString}|${this.cachePrefix}`;
    const stored = await this.getCache(cachekey);
    if (stored) {
      return stored;
    }

    const result = await this.client.getAllLists(filters);
    if (result) {
      await this.setCache(cachekey, result);
    }
    return result;
  }

  public async getListMembers(listId: string, options: Record<string, any> = {}): Promise<Record<string, any>[]> {
    // Create a cache key that includes the pagination parameters
    const optionsString = JSON.stringify(options);
    const cachekey = `SFMC|List|${listId}|Members|${optionsString}|${this.cachePrefix}`;
    const stored = await this.getCache(cachekey);
    if (stored) {
      return stored;
    }

    const result = await this.client.getListMembers(listId, options);
    if (result) {
      await this.setCache(cachekey, result);
    }
    return result;
  }

  public async createList(listDefinition: Record<string, any>): Promise<Record<string, any>> {
    await this.clearCache();
    return await this.client.createList(listDefinition);
  }

  public async updateList(listId: string, listDefinition: Record<string, any>): Promise<Record<string, any>> {
    await this.clearCache();
    return await this.client.updateList(listId, listDefinition);
  }

  public async deleteList(listId: string): Promise<boolean> {
    await this.clearCache();
    return await this.client.deleteList(listId);
  }

  public async addContactToList(listId: string, contactKey: string): Promise<Record<string, any>> {
    await this.clearCache();
    return await this.client.addContactToList(listId, contactKey);
  }

  public async removeContactFromList(listId: string, contactKey: string): Promise<boolean> {
    await this.clearCache();
    return await this.client.removeContactFromList(listId, contactKey);
  }
}
export { CachingClientWrapper as CachingClientWrapper };
