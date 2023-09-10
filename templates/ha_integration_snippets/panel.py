"""Panel and Websocket API."""
from __future__ import annotations

from typing import Final

import panel_package_name as my_panel
from homeassistant.components import panel_custom
from homeassistant.core import HomeAssistant

from .const import DOMAIN

URL_BASE: Final = "/panel_static"  # build-scripts/paths.cjs -> panel_publicPath


async def register_panel(hass: HomeAssistant) -> None:
    """Register the Panel."""
    if DOMAIN not in hass.data.get("frontend_panels", {}):
        hass.http.register_static_path(
            URL_BASE,
            path=my_panel.locate_dir(),
            cache_headers=my_panel.is_prod_build,
        )
        await panel_custom.async_register_panel(
            hass=hass,
            frontend_url_path=DOMAIN,
            webcomponent_name=my_panel.webcomponent_name,
            sidebar_title=DOMAIN.title(),
            sidebar_icon="mdi:human-greeting",
            module_url=f"{URL_BASE}/{my_panel.entrypoint_js}",
            embed_iframe=True,
            require_admin=True,
        )
