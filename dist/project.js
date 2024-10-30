export class Project {
    graphql;
    owner;
    projectId;
    project;
    constructor(graphql, owner, projectId) {
        this.graphql = graphql;
        this.owner = owner;
        this.projectId = projectId;
    }
    /**
     * Initializes the project, loading the fields
     */
    async initialize() {
        const query = `
            query ($owner: String!, $number: Int!) {
                organization(login: $owner){
                    project: projectV2(number: $number) {
                        ... on ProjectV2 {
                            id
                            title
                            fields(first: 25) {
                                totalCount
                                pageInfo {
                                    endCursor
                                    hasNextPage
                                }
                                nodes {
                                    ... on ProjectV2Field {
                                        id
                                        name
                                    }
                                    ... on ProjectV2IterationField {
                                        id
                                        name
                                        configuration {
                                            iterations {
                                                startDate
                                                id
                                            }
                                        }
                                    }
                                    ... on ProjectV2SingleSelectField {
                                        id
                                        name
                                        options {
                                            id
                                            name
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;
        const result = await this.graphql(query, {
            owner: this.owner,
            number: this.projectId,
        });
        this.project = result.organization.project;
    }
    getId() {
        return this.project.id;
    }
    getFieldByName(name) {
        const fields = this.getFields();
        return fields.find(f => f.name === name);
    }
    /**
     * Gets the fields for the project
     *
     * @returns the fields for the project
     */
    getFields() {
        return this.project.fields.nodes;
    }
    /**
     * Gets a project item from the project board by issue number
     *
     * @returns the matching project item
     */
    async getItem(repositoryName, issueNumber) {
        const projectItemQuery = `
            query ($owner: String!, $repository: String!, $issueNumber: Int!) {
                repository(owner: $owner, name: $repository) {
                    issue(number: $issueNumber) {
                        projectItems(first: 100) {
                            totalCount
                            pageInfo {
                                endCursor
                                hasNextPage
                            }
                            nodes {
                                id
                                project {
                                    id
                                    number
                                }
                                fieldValues(first: 25) {
                                    totalCount
                                    pageInfo {
                                        endCursor
                                        hasNextPage
                                    }
                                    nodes {                
                                        ... on ProjectV2ItemFieldTextValue {
                                            __typename
                                            id
                                            text
                                            field {
                                                ... on ProjectV2FieldCommon {
                                                    id
                                                    name
                                                }
                                            }
                                        }
                                        ... on ProjectV2ItemFieldDateValue {
                                            __typename
                                            id
                                            date
                                            field {
                                                ... on ProjectV2FieldCommon {
                                                    id
                                                    name
                                                }
                                            }
                                        }
                                        ... on ProjectV2ItemFieldSingleSelectValue {
                                            __typename
                                            id
                                            name
                                            optionId
                                            field {
                                                ... on ProjectV2FieldCommon {
                                                    id
                                                    name
                                                }
                                            }
                                        }
                                    }              
                                }
                                content {
                                    ... on Issue {
                                        __typename
                                        id
                                        number
                                        title
                                        state
                                        url
                                        labels(first:100) {
                                            nodes {
                                                id
                                                name
                                            }
                                        }
                                        issueType {
                                            id
                                            name
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;
        const results = await this.graphql(projectItemQuery, {
            owner: this.owner,
            repository: repositoryName,
            issueNumber
        });
        const { nodes } = results.repository.issue.projectItems;
        return nodes?.find(i => i?.project.number === this.projectId);
    }
    /**
     * Gets all items from the project board
     *
     * @returns all items on the project board
     */
    async getItems() {
        const query = `
            query ($owner: String!, $number: Int!, $cursor: String) {
                organization(login: $owner){
                    project: projectV2(number: $number) {
                        ... on ProjectV2 {
                            items(first: 100, after: $cursor) {
                                totalCount
                                pageInfo {
                                    endCursor
                                    hasNextPage
                                }
                                nodes {
                                    id
                                    fieldValues(first: 25) {
                                        totalCount
                                        pageInfo {
                                            endCursor
                                            hasNextPage
                                        }
                                        nodes {                
                                            ... on ProjectV2ItemFieldTextValue {
                                                __typename
                                                id
                                                text
                                                field {
                                                    ... on ProjectV2FieldCommon {
                                                        id
                                                        name
                                                    }
                                                }
                                            }
                                            ... on ProjectV2ItemFieldDateValue {
                                                __typename
                                                id
                                                date
                                                field {
                                                    ... on ProjectV2FieldCommon {
                                                        id
                                                        name
                                                    }
                                                }
                                            }
                                            ... on ProjectV2ItemFieldSingleSelectValue {
                                                __typename
                                                id
                                                name
                                                optionId
                                                field {
                                                    ... on ProjectV2FieldCommon {
                                                        id
                                                        name
                                                    }
                                                }
                                            }
                                        }              
                                    }
                                    content {
                                        ... on Issue {
                                            __typename
                                            id
                                            number
                                            title
                                            state
                                            url
                                            labels(first:100) {
                                                nodes {
                                                    id
                                                    name
                                                }
                                            }
                                            issueType {
                                                id
                                                name
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        `;
        return await this.pageItems(query);
    }
    async clearProjectItemFieldValue(input) {
        const query = `
        mutation ClearProjectItemFieldValue($input: ClearProjectV2ItemFieldValueInput!) {
            clearProjectV2ItemFieldValue(input: $input) {
                clientMutationId
                projectV2Item {
                    id
                }
            }
        }
        `;
        await this.graphql(query, {
            input
        });
    }
    async updateProjectItemFieldValue(input) {
        const query = `
        mutation UpdateProjectItemFieldValue($input: UpdateProjectV2ItemFieldValueInput!) {
            updateProjectV2ItemFieldValue(input: $input) {
                clientMutationId
                projectV2Item {
                    id
                }
            }
        }
        `;
        await this.graphql(query, {
            input
        });
    }
    async pageItems(query, cursor) {
        const items = [];
        const results = await this.graphql(query, {
            owner: this.owner,
            number: this.projectId,
            cursor: cursor ?? null,
        });
        const { nodes, pageInfo } = results.organization.project.items;
        items.push(...nodes);
        if (nodes.length === 100 && cursor != pageInfo.endCursor) {
            const nextPage = await this.pageItems(query, pageInfo.endCursor);
            items.push(...nextPage);
        }
        return items;
    }
}
//# sourceMappingURL=project.js.map