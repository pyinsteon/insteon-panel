from setuptools import setup, find_packages

setup(
    name="insteon-frontend",
    version="main",
    description="The insteon frontend",
    url="https://github.com/teharris1/insteon-panel",
    author="Joakim Sorensen",
    author_email="ludeeus@gmail.com",
    packages=find_packages(include=["insteon_frontend", "insteon_frontend.*"]),
    include_package_data=True,
    zip_safe=False,
)