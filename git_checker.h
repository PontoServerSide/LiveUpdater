#include <stdio.h>
#include <stdbool.h>
#include <git2.h>
#include <git2/clone.h>
#include <stdlib.h>
#include <string.h>
#include <pthread.h>
#include <unistd.h>
#include <signal.h>
#include <sys/time.h>

git_repository *repo = NULL;
git_remote *remote = NULL;
int error;

void interval_fetch_handler(int);
void git_error_handler(int);