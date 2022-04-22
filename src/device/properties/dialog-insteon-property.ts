import "@material/mwc-button/mwc-button";
// import "@polymer/paper-input/paper-input";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../homeassistant-frontend/src/components/ha-code-editor";
import { createCloseHeading } from "../../../homeassistant-frontend/src/components/ha-dialog";
import { haStyleDialog } from "../../../homeassistant-frontend/src/resources/styles";
import { HomeAssistant } from "../../../homeassistant-frontend/src/types";
import { Property, Insteon, PropertyRadioButtons } from "../../data/insteon";
import "../../../homeassistant-frontend/src/components/ha-form/ha-form";
import type {
  HaFormSchema,
  HaFormMultiSelectSchema,
} from "../../../homeassistant-frontend/src/components/ha-form/types";
import { InsteonPropertyDialogParams } from "./show-dialog-insteon-property";

@customElement("dialog-insteon-property")
class DialogInsteonProperty extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public insteon!: Insteon;

  @property({ type: Boolean }) public isWide?: boolean;

  @property({ type: Boolean }) public narrow?: boolean;

  @state() private _record!: Property;

  @state() private _schema!: HaFormSchema[];

  @state() private _title?: string;

  @state() private _callback?: (name: string, value: any) => Promise<void>;

  @state() private _formData = {};

  @state() private _errors: { [key: string]: string } = { base: "" };

  @state() private _opened = false;

  public async showDialog(params: InsteonPropertyDialogParams): Promise<void> {
    this.hass = params.hass;
    this.insteon = params.insteon;
    this._record = params.record;
    if (this._record.name == "radio_button_groups") {
      const rb_schema = params.schema[0] as HaFormMultiSelectSchema;
      this._formData = this._radio_button_value(
        this._record as PropertyRadioButtons,
        Math.floor(Object.entries(rb_schema.options).length / 2)
      );
      this._schema = this._radio_button_schema(this._record.value as [[number]] | [], rb_schema);
    } else {
      this._formData[this._record!.name] = this._record!.value;
      this._schema = params.schema;
    }
    this._callback = params.callback;
    this._title = params.title;
    this._errors = { base: "" };
    this._opened = true;
  }

  protected render(): TemplateResult {
    if (!this._opened) {
      return html``;
    }
    return html`
      <ha-dialog
        open
        @closed="${this._close}"
        .heading=${createCloseHeading(this.hass, this._title!)}
      >
        <div class="form">
          <ha-form
            .data=${this._formData}
            .schema=${this._schema}
            @value-changed=${this._valueChanged}
            .error=${this._errors}
          ></ha-form>
        </div>
        <div class="buttons">
          <mwc-button @click=${this._dismiss} slot="secondaryAction">
            ${this.hass.localize("ui.dialogs.generic.cancel")}
          </mwc-button>
          <mwc-button @click=${this._submit} slot="primaryAction">
            ${this.hass.localize("ui.dialogs.generic.ok")}
          </mwc-button>
        </div>
      </ha-dialog>
    `;
  }

  private _dismiss(): void {
    this._close();
  }

  private async _submit(): Promise<void> {
    if (!this._changeMade()) {
      this._close();
      return;
    }
    let value: string | boolean | number | [] | [[number]] | undefined = undefined;
    if (this._record.name == "radio_button_groups") {
      if (!this._validate_radio_buttons(this._formData)) {
        return;
      }
      value = this._radio_button_groups_to_value(this._formData);
    } else {
      value = this._formData[this._record!.name];
    }

    this._close();
    await this._callback!(this._record.name, value);
  }

  private _changeMade(): boolean {
    if (this._record.name == "radio_button_groups") {
      const form_values = this._radio_button_groups_to_value(this._formData);
      return this._record!.value !== form_values;
    }
    return this._record!.value !== this._formData[this._record!.name];
  }

  private _close(): void {
    this._opened = false;
  }

  private _valueChanged(ev: CustomEvent) {
    this._formData = ev.detail.value;
  }

  private _radio_button_value(
    curr_prop: PropertyRadioButtons,
    num_groups: number
  ): { [key: string]: [number] | [] } {
    const num_curr_groups = curr_prop.value.length;
    const curr_groups: [[number]] = curr_prop.value as [[number]];
    const radio_button_group_properties = {};
    for (let group = 0; group < num_groups; group++) {
      const group_name = "radio_button_group_" + group;
      if (group < num_curr_groups) {
        const group_string = [];
        curr_groups[group].forEach((value) => {
          // eslint-disable-next-line no-console
          console.info("Group " + group + " value " + value);
          return group_string.push(value.toString());
        });
        radio_button_group_properties[group_name] = group_string;
      } else {
        radio_button_group_properties[group_name] = [];
      }
      // eslint-disable-next-line no-console
      console.info(
        "New prop value: " + group_name + " value " + radio_button_group_properties[group_name]
      );
    }
    return radio_button_group_properties;
  }

  private _radio_button_schema(
    curr_groups: [[number]] | [],
    schema: HaFormMultiSelectSchema
  ): HaFormMultiSelectSchema[] {
    const new_schema: HaFormMultiSelectSchema[] = [];
    const num_buttons: number = Object.entries(schema.options).length;
    const max_groups: number = Math.floor(num_buttons / 2);
    const groups_options = {};

    for (let group = 0; group < max_groups; group++) {
      const group_name = "radio_button_group_" + group;
      // groups_options[group] = [];

      // // Get any current button group
      // if (group < curr_groups.length) {
      //   const curr_group = curr_groups[group];
      //   // Assign any buttons in the current group to the group options
      //   // and remove that button from the list of buttons to other groups
      //   curr_group.forEach((button) => {
      //     const button_name = this.insteon.localize(
      //       "properties.form_options." + schema.options[button]
      //     );
      //     groups_options[group].push([button, button_name]);
      //     delete schema.options[button];
      //   });
      // }

      // Add remaing buttons to all group options
      // Object.entries(schema.options).forEach(([option, value]) => {
      //   groups_options[group].push([option, value]);
      // });
      new_schema.push({
        name: group_name,
        type: "multi_select",
        optional: true,
        options: schema.options, // groups_options[group],
        description: { suffix: this.insteon!.localize("properties.descriptions." + group_name) },
      });
    }
    // eslint-disable-next-line no-console
    console.info("RB Schema length: " + new_schema.length);
    return new_schema;
  }

  private _radio_button_groups_to_value(props: { [key: string]: [number] | [] }): [[number]] | [] {
    const output: [[number]] | [] = [];
    Object.entries(props).forEach(([_, value]) => {
      if (value.length > 0) {
        const int_value = value.map((button) => {
          return +button;
        });
        output.push(int_value);
      }
    });
    return output;
  }

  private _validate_radio_buttons(props: { [key: string]: [string] | [] }): boolean {
    this._errors = { base: "" };
    let is_valid = true;
    // Make sure there are two entries in each group
    const selected_buttons: [string] | [] = [];
    Object.entries(props).forEach(([group_name, value]) => {
      if (value.length == 1) {
        this._errors[group_name] = "Must have at least 2 buttons in a group";
        is_valid = false;
      }
      if (value.length > 0) {
        value.forEach((button) => {
          // eslint-disable-next-line no-console
          console.info("Checking button " + button);
          if (selected_buttons.includes(button)) {
            // eslint-disable-next-line no-console
            console.info("Found buttong " + button);
            if (this._errors.base == "") {
              this._errors.base = "A button can not be selected twice";
            }
            is_valid = false;
          } else {
            selected_buttons.push(button);
          }
        });
      }
    });
    return is_valid;
  }

  static get styles(): CSSResultGroup[] {
    return [
      haStyleDialog,
      css`
        table {
          width: 100%;
        }
        ha-combo-box {
          width: 20px;
        }
        .title {
          width: 200px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-insteon-property": DialogInsteonProperty;
  }
}
