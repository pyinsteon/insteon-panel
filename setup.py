from setuptools import setup, find_packages

setup(
    name="insteon-frontend",
    version="1.0.0",
    description="The Insteon frontend",
    url="https://github.com/teharris1/insteon-panel",
    author="Tom Harris",
    author_email="pyinsteon@harrisnj.net",
    packages=find_packages(include=["insteon_frontend", "insteon_frontend.*"]),
    include_package_data=True,
    zip_safe=False,
)