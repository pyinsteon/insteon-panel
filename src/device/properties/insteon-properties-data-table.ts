import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import "@ha/components/ha-circular-progress";

import "@ha/components/data-table/ha-data-table";
import type {
  HaDataTable,
  DataTableColumnContainer,
  DataTableRowData,
} from "@ha/components/data-table/ha-data-table";
import type { InsteonProperty } from "../../data/insteon";
import type { HomeAssistant } from "@ha/types";
import { computeRTLDirection } from "@ha/common/util/compute_rtl";
import type { HaFormSchema } from "@ha/components/ha-form/types";
import { Insteon } from "../../data/insteon";

export interface RecordRowData {
  record?: InsteonProperty;
}

@customElement("insteon-properties-data-table")
export class InsteonPropertiesDataTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Array }) public records: InsteonProperty[] = [];

  @property() public schema: { [key: string]: HaFormSchema } = {};

  @property() public noDataText?: string;

  @property({ type: Boolean }) public showWait = false;

  private _records = memoizeOne((records: InsteonProperty[]): DataTableRowData => {
    return records.map((record) => ({
      description: this._calcDescription(record.name),
      display_value: this._translateValue(record.name, record.value),
      ...record,
    }));
  });

  private _calcDescription(prop_name: string) {
    if (prop_name.startsWith("toggle_")) {
      return (
        this.insteon.localize("properties.descriptions.button") +
        " " +
        this._calcButtonName(prop_name) +
        " " +
        this.insteon.localize("properties.descriptions.toggle")
      );
    }
    if (prop_name.startsWith("radio_button_group_")) {
      return (
        this.insteon.localize("properties.descriptions.radio_button_group") +
        " " +
        this._calcButtonName(prop_name)
      );
    }
    return this.insteon.localize("properties.descriptions." + prop_name);
  }

  private _calcButtonName(prop_name: string) {
    if (prop_name.endsWith("main")) {
      return this.insteon.localize("properties.descriptions.main");
    }
    return prop_name.substr(-1, 1).toUpperCase();
  }

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer =>
      narrow
        ? {
            name: {
              title: this.insteon.localize("properties.fields.name"),
              sortable: true,
              grows: true,
            },
            modified: {
              title: this.insteon.localize("properties.fields.modified"),
              template: (record) => {
                if (record.modified) {
                  return html`${this.hass.localize("ui.common.yes")}`;
                }
                return html`${this.hass.localize("ui.common.no")}`;
              },
              sortable: true,
              width: "20%",
            },
            display_value: {
              title: this.insteon.localize("properties.fields.value"),
              sortable: true,
              width: "20%",
            },
          }
        : {
            name: {
              title: this.insteon.localize("properties.fields.name"),
              sortable: true,
              width: "20%",
            },
            description: {
              title: this.insteon.localize("properties.fields.description"),
              sortable: true,
              grows: true,
            },
            modified: {
              title: this.insteon.localize("properties.fields.modified"),
              template: (record) => {
                if (record.modified) {
                  return html`${this.hass.localize("ui.common.yes")}`;
                }
                return html`${this.hass.localize("ui.common.no")}`;
              },
              sortable: true,
              width: "20%",
            },
            display_value: {
              title: this.insteon.localize("properties.fields.value"),
              sortable: true,
              width: "20%",
            },
          },
  );

  protected render(): TemplateResult {
    if (this.showWait) {
      return html`
        <ha-circular-progress
          class="fullwidth"
          active
          alt="Loading"
        ></ha-circular-progress>
      `;
    }
    return html`
      <ha-data-table
        .hass=${this.hass}
        .columns=${this._columns(this.narrow)}
        .data=${this._records(this.records!)}
        .id=${"name"}
        .dir=${computeRTLDirection(this.hass!)}
        noDataText="${this.noDataText!}"
      ></ha-data-table>
    `;
  }

  private _translateValue(
    name: string,
    value: number | boolean | [number] | [[number]] | [string] | [],
  ) {
    const schema = this.schema[name];
    if (schema.name == "radio_button_groups") {
      return "" + value.length + " groups";
    }
    if (schema.type === "multi_select" && Array.isArray(value)) {
      return value.map((item) => schema.options[item]).join(", ");
    }
    if (schema.type === "select") {
      const options_dict = schema.options?.reduce(
        (x, item) => ({ ...x, [item[0]]: item[1] }),
        {},
      );
      return options_dict[value.toString()];
    }
    return value;
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-circular-progress {
        align-items: center;
        justify-content: center;
        padding: 8px;
        box-sizing: border-box;
        width: 100%;
        flex-grow: 1;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "insteon-properties-data-table": InsteonPropertiesDataTable;
  }
}
