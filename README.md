# sfmc Cog

This is a [Crank][what-is-crank] Cog for sfmc, providing
steps and assertions for you to validate the state and behavior of your
sfmc instance.

* [Installation](#installation)
* [Usage](#usage)
* [Development and Contributing](#development-and-contributing)

## Installation

Ensure you have the `crank` CLI and `docker` installed and running locally,
then run the following.  You'll be prompted to enter your sfmc
credentials once the Cog is successfully installed.

```shell-session
$ crank cog:install stackmoxie/sfmc
```

Note: You can always re-authenticate later.

## Usage

### Authentication
<!-- run `crank cog:readme stackmoxie/sfmc` to update -->
<!-- authenticationDetails -->
You will be asked for the following authentication details on installation. To avoid prompts in a CI/CD context, you can provide the same details as environment variables.

| Field | Install-Time Environment Variable | Description |
| --- | --- | --- |
| **restEndpoint** | `CRANK_STACKMOXIE_SFMC__RESTENDPOINT` | REST API Instance URL, e.g. https://ZZZZZZZ.rest.marketingcloudapis.com/ |
| **clientId** | `CRANK_STACKMOXIE_SFMC__CLIENTID` | OAuth2 Client ID |
| **clientSecret** | `CRANK_STACKMOXIE_SFMC__CLIENTSECRET` | OAuth2 Client Secret |

```shell-session
# Re-authenticate by running this
$ crank cog:auth stackmoxie/sfmc
```
<!-- authenticationDetailsEnd -->

### Steps
Once installed, the following steps will be available for use in any of your
Scenario files.

<!-- run `crank cog:readme stackmoxie/sfmc` to update -->
<!-- stepDetails -->
| Name (ID) | Expression | Expected Data |
| --- | --- | --- |
| **Check a field on a SFMC contact**<br>(`ContactFieldEquals`) | `the (?<field>[a-zA-Z0-9_-]+) field on sfmc contact with key (?<contactKey>[a-zA-Z0-9_-]+) should (?<operator>be set\|not be set\|be less than\|be greater than\|be one of\|be\|contain\|not be one of\|not be\|not contain\|match\|not match) ?(?<expectation>.+)?` | - `contactKey`: Contact's unique key <br><br>- `field`: Field name to check <br><br>- `operator`: Check Logic (be, not be, contain, not contain, be greater than, be less than, be set, not be set, be one of, or not be one of) <br><br>- `expectation`: Expected field value |
| **Create a SFMC contact**<br>(`CreateContact`) | `create a sfmc contact` | - `contact`: A map of field names to field values |
| **Delete a SFMC contact**<br>(`DeleteContact`) | `delete the sfmc contact with key (?<contactKey>.+)` | - `contactKey`: Contact's unique key |
| **Discover fields on a SFMC contact**<br>(`DiscoverContact`) | `discover fields on the sfmc contact with key (?<contactKey>.+)` | - `contactKey`: Contact's unique key |
| **Update a SFMC contact**<br>(`UpdateContact`) | `update a sfmc contact with key (?<contactKey>.+)` | - `contactKey`: Contact's unique key <br><br>- `contact`: A map of field names to field values |
| **Activate a Salesforce Marketing Cloud journey**<br>(`ActivateJourney`) | `activate the salesforce marketing cloud journey with id (?<id>[a-zA-Z0-9_-]+)` | - `id`: ID or Key of the journey to activate |
| **Add a contact to a Salesforce Marketing Cloud journey**<br>(`AddContactToJourney`) | `add the contact with key (?<contactKey>[a-zA-Z0-9_@.-]+) to salesforce marketing cloud journey (?<journeyKey>[a-zA-Z0-9_-]+)` | - `contactKey`: Contact Key (or Email if using Email as Subscriber Key) <br><br>- `journeyKey`: Event Definition Key of the journey entry source <br><br>- `data`: Additional data to include with the contact for journey entry |
| **Check a Salesforce Marketing Cloud journey status**<br>(`CheckJourneyStatus`) | `the salesforce marketing cloud journey with id (?<journeyId>[a-zA-Z0-9_-]+) should have status (?<expectedStatus>.+)` | - `journeyId`: ID or Key of the journey to check <br><br>- `expectedStatus`: Expected status of the journey |
| **Create a Salesforce Marketing Cloud journey**<br>(`CreateJourney`) | `create a salesforce marketing cloud journey` | - `name`: Name of the journey <br><br>- `description`: Description of the journey <br><br>- `key`: Unique key for the journey <br><br>- `journey`: JSON object representing the journey definition |
| **Delete a Salesforce Marketing Cloud journey**<br>(`DeleteJourney`) | `delete the salesforce marketing cloud journey with id (?<id>[a-zA-Z0-9_-]+)` | - `id`: ID of the journey to delete |
| **Discover a Salesforce Marketing Cloud journey**<br>(`DiscoverJourney`) | `discover a salesforce marketing cloud journey with id (?<idOrKey>[a-zA-Z0-9_-]+)` | - `idOrKey`: ID or Key of the journey to discover <br><br>- `extras`: Extra information to include (activities, outcome, stats, all) |
| **Update a Salesforce Marketing Cloud journey**<br>(`UpdateJourney`) | `update the salesforce marketing cloud journey with id (?<id>[a-zA-Z0-9_-]+)` | - `id`: ID of the journey to update <br><br>- `name`: New name of the journey <br><br>- `description`: New description of the journey <br><br>- `journey`: JSON object representing the journey update definition |
| **Add a contact to a SFMC list**<br>(`AddContactToList`) | `add the salesforce marketing cloud contact with key (?<contactKey>.+) to list with id (?<listId>.+)` | - `contactKey`: The contact key to add to the list <br><br>- `listId`: The ID of the list to add the contact to |
| **Create a SFMC list**<br>(`CreateList`) | `create a salesforce marketing cloud list` | - `list`: A map of field names to field values |
| **Delete a SFMC list**<br>(`DeleteList`) | `delete the salesforce marketing cloud list with id (?<listId>.+)` | - `listId`: The ID of the list to delete |
| **Discover Salesforce Marketing Cloud list members**<br>(`DiscoverListMembers`) | `discover members of salesforce marketing cloud list with id (?<listId>.+)` | - `listId`: The ID of the list to get members from <br><br>- `page`: Page number for paginated results (optional) <br><br>- `pageSize`: Number of members per page (optional, default 50) <br><br>- `filters`: Additional filters to apply to the member search (optional) |
| **Discover Salesforce Marketing Cloud lists**<br>(`DiscoverLists`) | `discover salesforce marketing cloud lists` | - `filters`: Filters to apply to the list retrieval (optional) |
| **Remove a contact from a SFMC list**<br>(`RemoveContactFromList`) | `remove the salesforce marketing cloud contact with key (?<contactKey>.+) from list with id (?<listId>.+)` | - `contactKey`: The contact key to remove from the list <br><br>- `listId`: The ID of the list to remove the contact from |
| **Update a SFMC list**<br>(`UpdateList`) | `update the salesforce marketing cloud list with id (?<listId>.+)` | - `listId`: The ID of the list to update <br><br>- `list`: A map of field names to field values |
<!-- stepDetailsEnd -->

## Development and Contributing
Pull requests are welcome. For major changes, please open an issue first to
discuss what you would like to change. Please make sure to add or update tests
as appropriate.

### Setup

1. Install node.js (v12.x+ recommended)
2. Clone this repository.
3. Install dependencies via `npm install`
4. Run `npm start` to validate the Cog works locally (`ctrl+c` to kill it)
5. Run `crank cog:install --source=local --local-start-command="npm start"` to
   register your local instance of this Cog. You may need to append a `--force`
   flag or run `crank cog:uninstall stackmoxie/sfmc` if you've already
   installed the distributed version of this Cog.

### Adding/Modifying Steps
Modify code in `src/steps` and validate your changes by running
`crank cog:step stackmoxie/sfmc` and selecting your step.

To add new steps, create new step classes in `src/steps`. Use existing steps as
a starting point for your new step(s). Note that you will need to run
`crank registry:rebuild` in order for your new steps to be recognized.

Always add tests for your steps in the `test/steps` folder. Use existing tests
as a guide.

### Modifying the API Client or Authentication Details
Modify the ClientWrapper class at `src/client/client-wrapper.ts`.

- If you need to add or modify authentication details, see the
  `expectedAuthFields` static property.
- If you need to expose additional logic from the wrapped API client, add a new
  public method to the wrapper class or mixins, which can then be called in any
  step.
- It's also possible to swap out the wrapped API client completely. You should
  only have to modify code within this class or mixins to achieve that.

Note that you will need to run `crank registry:rebuild` in order for any
changes to authentication fields to be reflected. Afterward, you can
re-authenticate this Cog by running `crank cog:auth stackmoxie/sfmc`

### Tests and Housekeeping
Tests can be found in the `test` directory and run like this: `npm test`.
Ensure your code meets standards by running `npm run lint`.

[what-is-crank]: https://crank.run?utm_medium=readme&utm_source=stackmoxie%2Fsfmc
