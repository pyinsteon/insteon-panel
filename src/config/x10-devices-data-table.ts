import { html, LitElement, TemplateResult } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import "@ha/components/ha-circular-progress";
import "@ha/components/data-table/ha-data-table";
import { DataTableColumnContainer } from "@ha/components/data-table/ha-data-table";
import type { Insteon } from "../data/insteon";
import type { InsteonX10Device } from "../data/config"
import type { HomeAssistant } from "@ha/types";
import { computeRTLDirection } from "@ha/common/util/compute_rtl";

export interface RecordRowData extends InsteonX10Device {
  record?: InsteonX10Device;
}

@customElement("x10-devices-data-table")
export class X10DevicesDataTable extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public records: InsteonX10Device[] = [];

  @property({ type: Boolean }) public isLoading = false;

  @property({ type: Boolean }) public showWait = false;

  private _records = memoizeOne((records: InsteonX10Device[]) => {
    if (!records) {
      return [];
    }
    const outputRecords: RecordRowData[] = records;

    return outputRecords.map((record) => ({
      ...record,
    }));
  });

  private _columns = memoizeOne(
    (narrow: boolean): DataTableColumnContainer =>
      narrow ? {
        housecode: {
          title: this.insteon.localize("utils.config_x10_devices.fields.housecode"),
          sortable: true,
          width: "15%",
        },
        unitcode: {
          title: this.insteon.localize("utils.config_x10_devices.fields.unitcode"),
          sortable: true,
          width: "15%",
        },
        entity_name: {
          title: this.insteon.localize("utils.config_x10_devices.fields.entity_name"),
          sortable: true,
          grows: true,
        }
      }
        : {
          housecode: {
            title: this.insteon.localize("utils.config_x10_devices.fields.housecode"),
            sortable: true,
            width: "15%",
          },
          unitcode: {
            title: this.insteon.localize("utils.config_x10_devices.fields.unitcode"),
            sortable: true,
            width: "15%",
          },
          entity_name: {
            title: this.insteon.localize("utils.config_x10_devices.fields.entity_name"),
            sortable: true,
            grows: true,
          },
          platform: {
            title: this.insteon.localize("utils.config_x10_devices.fields.platform"),
            sortable: true,
            width: "15%",
          },
          dim_steps: {
            title: this.insteon.localize("utils.config_x10_devices.fields.dim_steps"),
            sortable: true,
            width: "15%",
          },
          actions: {
            title: "Actions",
            type: "icon-button",
            template: () => html`

            `
          }
        }
  );

  private _noDataText(loading): string {
    if (loading) {
      return "";
    }
    return this.insteon.localize("utils.config_x10_devices.no_data");
  }

  protected render(): TemplateResult {
    if (this.showWait) {
      return html`
        <ha-circular-progress active alt="Loading"></ha-circular-progress>
      `;
    }
    return html`
      <ha-data-table
        .hass=${this.hass}
        .columns=${this._columns(this.narrow)}
        .data=${this._records(this.records)}
        .dir=${computeRTLDirection(this.hass)}
        .searchLabel=${this.hass.localize("ui.components.data-table.search")}
        .noDataText="${this._noDataText(this.isLoading)}"
      >
        <ha-circular-progress active alt="Loading"></ha-circular-progress>
      </ha-data-table>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "x10-devices-data-table": X10DevicesDataTable;
  }
}
