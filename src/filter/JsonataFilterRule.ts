import jsonata from "jsonata";
import { FilterRule } from "./FilterRule.js";
import { LogEvent } from "../model/LogEvent.js";

/**
 * Class representing a filter rule that matches events based on a Jsonata expression.
 */
export class JsonataFilterRule implements FilterRule {
    private query: string;
    private expression: jsonata.Expression;

    constructor(query: string) {
        this.query = query;
        this.expression = jsonata(query);
    }

    async matches(event: LogEvent): Promise<boolean> {
        let result: any;
        try {
            const eventPayload = event.payload;
            result = await this.expression.evaluate(eventPayload); // Await the result
            return result !== undefined && result !== null && result !== false;
        } catch (error) {
            const eventPayload = event.payload;
            console.log("Evaluating Jsonata query:", this.query, "on event:", event, "payload:", eventPayload, "Result:", result);
            console.log("Error evaluating Jsonata query:", error);
            return false;
        }
    }
}