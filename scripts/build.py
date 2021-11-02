import os

print("CREATE REFERENCES BY ATTRIBUTES")
os.system("python create_references_by_attributes.py -p doc/modules")
print("CREATE NAV.ADOC FOR FOLDER")
os.system("python create_nav_adoc_for_folder.py -p doc/modules/ROOT/pages/")
os.system("cd ..")
print("RUN DOCKER-COMPOSE")
os.system("docker-compose run custom-lunr")
os.system("cd scripts")
print("CLEANUP AFTER BUILD")
os.system("python cleanup_after_build.py -p doc/modules")