from setuptools import setup, find_packages

setup(
    name="insteon-frontend-home-assistant",
    version="0.1.1",
    url="https://github.com/teharris1/insteon-panel",
    license="MIT License",
    description="The Insteon frontend for Home Assistant",
    author="Tom Harris",
    author_email="pyinsteon@harrisnj.net",
    packages=find_packages(include=["insteon_frontend", "insteon_frontend.*"]),
    include_package_data=True,
    zip_safe=False,
)