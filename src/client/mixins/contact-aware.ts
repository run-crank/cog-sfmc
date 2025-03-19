export class ContactAwareMixin {
  client: any;

  public async getContactByEmail(email: string): Promise<Object> {
    try {
      const contactKeyResponse = await this.client.rest.post('/contacts/v1/addresses/email/search', {
        channelAddressList: [email],
        maximumCount: 1,
      });

      const contactKey = contactKeyResponse?.channelAddressResponseEntities?.[0]?.contactKeyDetails?.[0]?.contactKey;
      if (!contactKey) {
        throw new Error(`No contact key found for email: ${email}`);
      }

      const contactResponse = await this.client.rest.post('/contacts/v1/establish', {
        contactKeys: [contactKey],
      });

      return contactResponse?.[0]?.items?.[0]?.value?.contactReference || null;
    } catch (error) {
      console.error('Error fetching contact by email:', error);
      return null;
    }
  }
}
