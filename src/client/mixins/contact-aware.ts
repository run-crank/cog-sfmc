export class ContactAwareMixin {
  client: any;

  public async getContactByKey(contactKey: string): Promise<Object> {
    try {
      console.log('Establishing contact by key...');
      const establishResponse = await this.client.post({
        uri: 'contacts/v1/establish',
        body: JSON.stringify({
          contactKeys: [contactKey],
          returnResults: true,
          correlateResponseItem: true,
        }),
      });

      const contact = establishResponse.body.items?.[0]?.value?.contactReference;
      if (!contact) {
        console.error(`No contact found for contact key: ${contactKey}`);
        return null;
      }

      return contact;
    } catch (error) {
      console.error('Error fetching contact by key:', error);
      return null;
    }
  }

  public async getContactByEmail(email: string): Promise<Object> {
    try {
      console.log('Searching for contact by email...');
      const emailSearchResponse = await this.client.post({
        uri: 'contacts/v1/addresses/email/search',
        body: JSON.stringify({
          channelAddressList: [email],
          maximumCount: 1,
        }),
      });

      console.log('Full emailSearchResponse:', JSON.stringify(emailSearchResponse.body, null, 2));
      console.log('Channel Address Entities:', JSON.stringify(emailSearchResponse.body.channelAddressResponseEntities, null, 2));

      const contactKey = emailSearchResponse.body.channelAddressResponseEntities?.[0]?.contactKeyDetails?.[0]?.contactKey;

      if (!contactKey) {
        console.error('No contact found by email');
        return null;
      }

      return this.getContactByKey(contactKey);
    } catch (error) {
      console.error('Error fetching contact by email:', error);
      return null;
    }
  }
}
