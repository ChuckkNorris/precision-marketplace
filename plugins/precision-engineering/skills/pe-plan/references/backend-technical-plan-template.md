# <PlanTitle>

Short summary of requirements, changes, and expected outcomes.

## Endpoints

### <EndpointName> (`<HttpMethod> /endpoint-path`)

Short summary of endpoint

#### Metadata

- Bulleted list of metadata about the endpoint such as authorization roles or any other relevant info

#### Endpoint Flow

- Bulleted list of step-by-step flow of a request (e.g. key actions)

#### Request Headers (If applicable)

List of required/optional request headers, what they do and why

#### Query String Parameters (If applicable)

List of required/optional query string parameters, what they do and why

#### Request Body

Expected request body e.g.
```json
{
  "example": "value"
}
```

#### Response Body

Example response body e.g.
```json
{
  "example": "value"
}
```

#### Callstack

Example callstack of core endpoint interaction used by engineers to understand overall endpoint execution

#### <AdditionalEndpointSection>

Add additional sections as needed to ensure enough information is available to isolated agent that may implement the plan without any previous context.

## Database Changes

Summary of new, updated, or removed database entities or fields in table form for each entity

## Interface Updates

Summary of updated interfaces not captured above (e.g. Enum values, other affected areas/modules)
