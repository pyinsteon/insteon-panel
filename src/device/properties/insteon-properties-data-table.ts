import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import "../../../homeassistant-frontend/src/components/ha-circular-progress";
import "../../data-table/insteon-data-table";
import type {
  InsteonDataTable,
  DataTableColumnContainer,
} from "../../data-table/insteon-data-table";
import type { Property } from "../../data/insteon";
import type { HomeAssistant } from "../../../homeassistant-frontend/src/types";
import { computeRTLDirection } from "../../../homeassistant-frontend/src/common/util/compute_rtl";
import type { HaFormSchema } from "../../../homeassistant-frontend/src/components/ha-form/types";
import { Insteon } from "../../data/insteon";

export interface RecordRowData extends Property {
  record?: Property;
}

@customElement("insteon-properties-data-table")
export class InsteonPropertiesDataTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Array }) public records: Property[] = [];

  @property() public schema: { [key: string]: HaFormSchema } = {};

  @property() public noDataText?: string;

  @property({ type: Boolean }) public showWait = false;

  @query("insteon-data-table") private _dataTable!: InsteonDataTable;

  private _records = memoizeOne((records: Property[]) => {
    const outputRecords: RecordRowData[] = records;

    return outputRecords.map((record) => ({
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
    if (
      prop_name.startsWith("on_mask_") ||
      prop_name.startsWith("off_mask_") ||
      prop_name.startsWith("ramp_rate_") ||
      prop_name.startsWith("on_level_")
    ) {
      return (
        this.insteon.localize(
          "properties.descriptions." + prop_name.substr(0, prop_name.length - 2)
        ) +
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
              template: (modified: boolean) => {
                if (modified) {
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
              template: (modified: boolean) => {
                if (modified) {
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
  );

  public clearSelection() {
    this._dataTable.clearSelection();
  }

  protected render(): TemplateResult {
    // eslint-disable-next-line no-console
    console.info("Got records: " + this.records.length);
    if (this.showWait) {
      return html`
        <ha-circular-progress class="fullwidth" active alt="Loading"></ha-circular-progress>
      `;
    }
    return html`
      <insteon-data-table
        .columns=${this._columns(this.narrow)}
        .data=${this._records(this.records!)}
        .id=${"name"}
        .dir=${computeRTLDirection(this.hass!)}
        noDataText="${this.noDataText!}"
      ></insteon-data-table>
    `;
  }

  private _translateValue(name: string, value: boolean | number | string | []) {
    const schema = this.schema[name];
    if (schema.type === "multi_select" && Array.isArray(value)) {
      return value.map((item) => schema.options[item]).join(", ");
    }
    if (schema.type === "select") {
      const options_dict = schema.options?.reduce((x, item) => ({ ...x, [item[0]]: item[1] }), {});
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
