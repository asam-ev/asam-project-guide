import os

def main():
    reference_macro_replacement()
    # nav_adoc_creation()
    run_docker_compose()
    cleanup()
    open_project_guide()
    print("BUILD DONE")
    os.chdir("../scripts")


def reference_macro_replacement():
    print("CREATE REFERENCES BY ATTRIBUTES")
    os.system("python create_references_by_attributes.py -p doc/modules")

def nav_adoc_creation():
    print("CREATE NAV.ADOC FOR FOLDER")
    os.system("python create_nav_adoc_for_folder.py -p doc/modules/ROOT/pages/")

def run_docker_compose():
    print("RUN DOCKER-COMPOSE")
    os.chdir("../")
    # print(os.getcwd())
    os.system("docker-compose run custom-lunr")

def cleanup():
    print("CLEANUP AFTER BUILD")
    os.chdir("./scripts")
    # print(os.getcwd())
    os.system("python cleanup_after_build.py -p doc/modules")

def open_project_guide():
    print("OPEN INDEX.HTML")
    os.chdir("../site")
    # print(os.getcwd())
    os.system("start chrome {pos}".format(pos = os.getcwd()+"/index.html"))

if __name__ == "__main__":
    main()